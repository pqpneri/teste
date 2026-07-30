# Salvamento do cartão na galeria — Android WebView

Somente HTML/JavaScript não consegue garantir o salvamento direto na galeria dentro de um APK WebView. O APK precisa disponibilizar uma ponte nativa chamada `Android.saveImageToGallery(dataUrl, fileName)`.

## 1. Classe da ponte Kotlin

```kotlin
package seu.pacote

import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import java.io.File
import java.io.FileOutputStream

class WebAppBridge(
    private val activity: Activity,
    private val webView: WebView
) {
    @JavascriptInterface
    fun saveImageToGallery(dataUrl: String, fileName: String) {
        Thread {
            try {
                val cleanBase64 = dataUrl.substringAfter("base64,")
                val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                val safeName = if (fileName.endsWith(".png")) fileName else "$fileName.png"

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.Images.Media.DISPLAY_NAME, safeName)
                        put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                        put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Unigames")
                        put(MediaStore.Images.Media.IS_PENDING, 1)
                    }

                    val resolver = activity.contentResolver
                    val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                        ?: error("Não foi possível criar o arquivo na galeria")

                    resolver.openOutputStream(uri)?.use { it.write(bytes) }
                        ?: error("Não foi possível abrir o arquivo")

                    values.clear()
                    values.put(MediaStore.Images.Media.IS_PENDING, 0)
                    resolver.update(uri, values, null, null)
                } else {
                    val pictures = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                    val folder = File(pictures, "Unigames")
                    if (!folder.exists()) folder.mkdirs()
                    FileOutputStream(File(folder, safeName)).use { it.write(bytes) }
                    MediaStore.Images.Media.insertImage(
                        activity.contentResolver,
                        File(folder, safeName).absolutePath,
                        safeName,
                        "Cartão Unigames"
                    )
                }

                callback(true, "Imagem salva em Fotos/Pictures/Unigames")
            } catch (error: Exception) {
                callback(false, "Erro ao salvar: ${error.message ?: "erro desconhecido"}")
            }
        }.start()
    }

    private fun callback(success: Boolean, message: String) {
        activity.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_LONG).show()
            val safeMessage = message.replace("\\", "\\\\").replace("'", "\\'")
            webView.evaluateJavascript(
                "window.onAndroidImageSaved && window.onAndroidImageSaved(${success}, '$safeMessage');",
                null
            )
        }
    }
}
```

## 2. Configuração obrigatória do WebView

A ponte precisa ser adicionada **antes** de carregar o site:

```kotlin
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true
webView.settings.allowFileAccess = true
webView.settings.allowContentAccess = true

webView.addJavascriptInterface(
    WebAppBridge(this, webView),
    "Android"
)

webView.loadUrl("file:///android_asset/index.html")
```

Não altere o nome `Android`, porque o site chama exatamente:

```javascript
window.Android.saveImageToGallery(dataUrl, nomeArquivo)
```

## 3. Permissão para Android 9 ou inferior

No `AndroidManifest.xml`:

```xml
<uses-permission
    android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />
```

Para Android 9 ou inferior, também solicite essa permissão em tempo de execução. No Android 10 ou superior, o MediaStore usado acima não exige permissão de armazenamento.

## 4. Evitar cache do layout antigo

Durante os testes, desative o cache ou limpe os dados do APK:

```kotlin
webView.settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
webView.clearCache(true)
```

Depois de confirmar a atualização, você pode voltar ao cache padrão.

## Diagnóstico rápido

Abra o console do WebView e teste:

```javascript
typeof window.Android
```

O resultado precisa ser `object`. Depois:

```javascript
typeof window.Android.saveImageToGallery
```

O resultado precisa ser `function`. Caso apareça `undefined`, a falha está na integração do APK, não no botão do site.
