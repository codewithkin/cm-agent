package expo.modules.smsreader

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads EcoCash confirmations with Google's SMS User Consent API, so the app
 * needs no SMS permissions. startListening() watches for the next incoming SMS
 * for up to 5 minutes; when one arrives, Android asks the person to allow the
 * app to read that single message, and "onSms" fires with its text.
 */
class SmsReaderModule : Module() {
  private var receiver: BroadcastReceiver? = null
  private var pendingConsent: Intent? = null
  private var inForeground = true

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    Events("onSms", "onTimeout", "onDenied", "onPending")

    AsyncFunction("startListening") { promise: Promise ->
      registerReceiver()
      SmsRetriever.getClient(context)
        .startSmsUserConsent(null)
        .addOnSuccessListener { promise.resolve(true) }
        .addOnFailureListener { promise.resolve(false) }
    }

    Function("stopListening") {
      unregisterReceiver()
    }

    OnActivityEntersForeground {
      inForeground = true
      launchPendingConsent()
    }

    OnActivityEntersBackground {
      inForeground = false
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != CONSENT_REQUEST) return@OnActivityResult
      val body = payload.data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
      if (payload.resultCode == Activity.RESULT_OK && body != null) {
        sendEvent("onSms", mapOf("body" to body, "receivedAt" to System.currentTimeMillis().toDouble()))
      } else {
        sendEvent("onDenied", emptyMap<String, Any>())
      }
    }

    OnDestroy {
      unregisterReceiver()
    }
  }

  /** Shows Android's "Allow app to read this message?" sheet, or waits until the app is open. */
  private fun launchPendingConsent() {
    val consent = pendingConsent ?: return
    val activity = appContext.currentActivity
    if (activity == null || !inForeground) {
      sendEvent("onPending", emptyMap<String, Any>())
      return
    }
    try {
      activity.startActivityForResult(consent, CONSENT_REQUEST)
      pendingConsent = null
    } catch (_: Exception) {
      sendEvent("onPending", emptyMap<String, Any>())
    }
  }

  private fun registerReceiver() {
    if (receiver != null) return
    val consentReceiver = object : BroadcastReceiver() {
      override fun onReceive(receiverContext: Context, intent: Intent) {
        if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
        val extras = intent.extras ?: return
        when (extras.parcelable<Status>(SmsRetriever.EXTRA_STATUS)?.statusCode) {
          CommonStatusCodes.SUCCESS -> {
            pendingConsent = extras.parcelable<Intent>(SmsRetriever.EXTRA_CONSENT_INTENT) ?: return
            launchPendingConsent()
          }
          CommonStatusCodes.TIMEOUT -> sendEvent("onTimeout", emptyMap<String, Any>())
        }
      }
    }
    val filter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(consentReceiver, filter, SmsRetriever.SEND_PERMISSION, null, Context.RECEIVER_EXPORTED)
    } else {
      context.registerReceiver(consentReceiver, filter, SmsRetriever.SEND_PERMISSION, null)
    }
    receiver = consentReceiver
  }

  private fun unregisterReceiver() {
    receiver?.let {
      try {
        context.unregisterReceiver(it)
      } catch (_: IllegalArgumentException) {
        // Already unregistered.
      }
    }
    receiver = null
  }

  private inline fun <reified T : android.os.Parcelable> Bundle.parcelable(key: String): T? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      getParcelable(key, T::class.java)
    } else {
      @Suppress("DEPRECATION")
      getParcelable(key) as? T
    }

  private companion object {
    const val CONSENT_REQUEST = 4521
  }
}
