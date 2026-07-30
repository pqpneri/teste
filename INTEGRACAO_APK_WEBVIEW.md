# Integração Android WebView — salvar PNG na galeria

O botão **Salvar no aparelho** chama esta função JavaScript:

```javascript
window.Android.saveBase64Image(base64SemPrefixo, nomeDoArquivo)
```

Sem essa ponte nativa, um WebView pode bloquear downloads `data:image/png;base64`. Portanto, a solução confiável exige o código abaixo no APK.

## 1. WebAppInterface.kt

```kotlin
package com.seuapp

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import java.io.File
import java.io.FileOutputStream

class WebAppInterface(
    private val context: Context,
    private val webView: WebView
) {
    @JavascriptInterface
    fun saveBase64Image(base64: String, fileName: String) {
        try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            val safeName = if (fileName.endsWith(".png")) fileName else "$fileName.png"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, safeName)
                    put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                    put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Unigames")
                    put(MediaStore.Images.Media.IS_PENDING, 1)
                }
                val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                    ?: throw IllegalStateException("Não foi possível criar o arquivo")
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                values.clear()
                values.put(MediaStore.Images.Media.IS_PENDING, 0)
                context.contentResolver.update(uri, values, null, null)
            } else {
                val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Unigames")
                if (!dir.exists()) dir.mkdirs()
                FileOutputStream(File(dir, safeName)).use { it.write(bytes) }
            }

            callback(true, "Imagem salva na galeria, na pasta Unigames.")
        } catch (e: Exception) {
            callback(false, "Falha ao salvar: ${e.message ?: "erro desconhecido"}")
        }
    }

    private fun callback(success: Boolean, message: String) {
        val escaped = message.replace("\\", "\\\\").replace("'", "\\'")
        webView.post {
            webView.evaluateJavascript(
                "window.onAndroidImageSaved(${success}, '$escaped')",
                null
            )
        }
    }
}
```

## 2. MainActivity.kt

```kotlin
@SuppressLint("SetJavaScriptEnabled")
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    val webView = findViewById<WebView>(R.id.webView)

    webView.settings.javaScriptEnabled = true
    webView.settings.domStorageEnabled = true
    webView.settings.allowFileAccess = true
    webView.settings.allowContentAccess = true

    webView.webViewClient = WebViewClient()
    webView.addJavascriptInterface(WebAppInterface(this, webView), "Android")

    webView.loadUrl("file:///android_asset/index.html")
}
```

## 3. Permissão para Android 9 ou inferior

No `AndroidManifest.xml`:

```xml
<uses-permission
    android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />
```

Em Android 10 ou superior, o código usa `MediaStore` e não precisa pedir permissão de armazenamento.

## 4. Importante

Depois de substituir os arquivos do site dentro do APK, limpe o cache do WebView ou reinstale o APK. Os arquivos deste pacote usam versão nos links CSS/JS para evitar que o layout antigo continue aparecendo.
