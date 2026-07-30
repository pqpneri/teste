# Integração para salvar PNG no APK WebView

O site tenta, nesta ordem:

1. `window.Android.saveBase64Image(base64, nomeArquivo)`
2. `window.Android.downloadBase64File(base64, mimeType, nomeArquivo)`
3. `window.ReactNativeWebView.postMessage(...)`
4. Compartilhamento nativo pelo Web Share API
5. Pré-visualização da imagem para abrir, baixar ou tocar e segurar

Para o salvamento direto funcionar em um APK Android WebView, adicione uma ponte JavaScript no aplicativo.

## Exemplo Kotlin

```kotlin
class WebAppBridge(private val activity: Activity) {
    @JavascriptInterface
    fun saveBase64Image(base64: String, fileName: String) {
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        val resolver = activity.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Unigames")
        }
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            ?: return
        resolver.openOutputStream(uri)?.use { it.write(bytes) }
        activity.runOnUiThread {
            Toast.makeText(activity, "Imagem salva em Fotos/Unigames", Toast.LENGTH_LONG).show()
        }
    }
}
```

No WebView:

```kotlin
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true
webView.addJavascriptInterface(WebAppBridge(this), "Android")
```

Imports necessários:

```kotlin
import android.app.Activity
import android.content.ContentValues
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.widget.Toast
```

Também é recomendado habilitar abertura de novas janelas ou tratar `window.open`, porque o site usa essa opção como alternativa para exibir a imagem.
