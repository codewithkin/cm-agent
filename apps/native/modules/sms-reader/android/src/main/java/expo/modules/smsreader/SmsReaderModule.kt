package expo.modules.smsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Telephony
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads SMS for the booth phones: "onSms" fires for each new message while the
 * app is running, and readInboxSince picks up anything missed while it wasn't.
 * The JS side keeps only messages from the EcoCash senders in settings.
 */
class SmsReaderModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    Events("onSms")

    OnStartObserving { startListening() }

    OnStopObserving { stopListening() }

    AsyncFunction("readInboxSince") { sinceMillis: Double, senders: List<String> ->
      val messages = mutableListOf<Map<String, Any>>()
      val cursor = context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
        "${Telephony.Sms.DATE} > ?",
        arrayOf(sinceMillis.toLong().toString()),
        "${Telephony.Sms.DATE} ASC"
      )
      cursor?.use {
        while (it.moveToNext()) {
          val sender = it.getString(0) ?: continue
          if (senders.isNotEmpty() && senders.none { allowed -> allowed.equals(sender, ignoreCase = true) }) continue
          messages.add(
            mapOf(
              "sender" to sender,
              "body" to (it.getString(1) ?: ""),
              "receivedAt" to it.getLong(2).toDouble()
            )
          )
        }
      }
      messages
    }
  }

  private fun startListening() {
    if (receiver != null) return
    val smsReceiver = object : BroadcastReceiver() {
      override fun onReceive(receiverContext: Context, intent: Intent) {
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        val first = parts.firstOrNull() ?: return
        val sender = first.originatingAddress ?: return
        // Long messages arrive as several parts from the same sender.
        val body = parts.joinToString("") { part -> part.messageBody ?: "" }
        sendEvent(
          "onSms",
          mapOf("sender" to sender, "body" to body, "receivedAt" to first.timestampMillis.toDouble())
        )
      }
    }
    val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      context.registerReceiver(smsReceiver, filter)
    }
    receiver = smsReceiver
  }

  private fun stopListening() {
    receiver?.let {
      try {
        context.unregisterReceiver(it)
      } catch (_: IllegalArgumentException) {
        // Already unregistered.
      }
    }
    receiver = null
  }
}
