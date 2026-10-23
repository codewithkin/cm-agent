package expo.modules.fileviewer

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Opens a saved file (a content:// URI) in whichever app shows that type,
 * e.g. a PDF viewer, with read access granted to that app only.
 */
class FileViewerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FileViewer")

    // False when no installed app can open the file.
    Function("open") { uri: String, mimeType: String ->
      val activity = appContext.currentActivity ?: return@Function false
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(Uri.parse(uri), mimeType)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      try {
        activity.startActivity(intent)
        true
      } catch (error: ActivityNotFoundException) {
        false
      }
    }
  }
}
