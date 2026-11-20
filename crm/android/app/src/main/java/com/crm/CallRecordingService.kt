package com.crm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File

class CallRecordingService : Service() {

    companion object {
        const val TAG = "CallRecordingService"
        const val CHANNEL_ID = "crm_call_recording_channel"
        const val NOTIFICATION_ID = 48219

        var activeFile: File? = null
            private set
        var isRecording: Boolean = false
            private set
        private var mediaRecorder: MediaRecorder? = null
        private var instance: CallRecordingService? = null

        fun start(context: Context, phoneNumber: String): File {
            val safePhone = phoneNumber.replace("[^0-9]".toRegex(), "").takeLast(10).ifEmpty { "call" }
            val file = File(context.cacheDir, "call_auto_${System.currentTimeMillis()}_${safePhone}.m4a")
            activeFile = file

            val intent = Intent(context, CallRecordingService::class.java).apply {
                action = "START"
                putExtra("filePath", file.absolutePath)
                putExtra("phone", safePhone)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            return file
        }

        fun stop(context: Context): File? {
            val file = activeFile
            instance?.stopSpeakerEnforcer()
            disableSpeakerphone(context)

            try {
                mediaRecorder?.apply {
                    try { stop() } catch (e: Exception) {}
                    release()
                }
            } catch (e: Exception) {}
            mediaRecorder = null
            isRecording = false

            try {
                instance?.stopForeground(true)
                instance?.stopSelf()
            } catch (e: Exception) {}
            instance = null

            return if (file != null && file.exists() && file.length() > 512) file else null
        }

        fun enableSpeakerphone(context: Context) {
            try {
                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val devices = audioManager.availableCommunicationDevices
                    val speaker = devices.find { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
                    if (speaker != null) {
                        audioManager.setCommunicationDevice(speaker)
                    }
                }
                @Suppress("DEPRECATION")
                audioManager.isSpeakerphoneOn = true
            } catch (e: Exception) {
                Log.w(TAG, "enableSpeakerphone error: ${e.message}")
            }
        }

        fun disableSpeakerphone(context: Context) {
            try {
                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    audioManager.clearCommunicationDevice()
                }
                @Suppress("DEPRECATION")
                audioManager.isSpeakerphoneOn = false
                audioManager.mode = AudioManager.MODE_NORMAL
            } catch (e: Exception) {
                Log.w(TAG, "disableSpeakerphone error: ${e.message}")
            }
        }
    }

    private var speakerEnforcerHandler: Handler? = null
    private var enforcerCount = 0

    private fun startSpeakerEnforcer() {
        stopSpeakerEnforcer()
        enforcerCount = 0
        speakerEnforcerHandler = Handler(Looper.getMainLooper())
        val runnable = object : Runnable {
            override fun run() {
                if (isRecording && enforcerCount < 15) {
                    enforcerCount++
                    enableSpeakerphone(applicationContext)
                    speakerEnforcerHandler?.postDelayed(this, 1000)
                }
            }
        }
        speakerEnforcerHandler?.post(runnable)
    }

    private fun stopSpeakerEnforcer() {
        speakerEnforcerHandler?.removeCallbacksAndMessages(null)
        speakerEnforcerHandler = null
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "START") {
            val filePath = intent.getStringExtra("filePath")
            val phone = intent.getStringExtra("phone") ?: ""
            if (filePath != null) {
                startForegroundNotification(phone)
                enableSpeakerphone(applicationContext)
                startSpeakerEnforcer()
                startMediaRecorder(File(filePath))
            }
        } else if (intent?.action == "STOP") {
            stop(this)
        }
        return START_NOT_STICKY
    }

    private fun startForegroundNotification(phone: String) {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("CRM Sync Service")
            .setContentText("Lead synchronization active")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startMediaRecorder(outputFile: File) {
        try {
            mediaRecorder?.apply {
                try { stop() } catch (e: Exception) {}
                release()
            }
            mediaRecorder = null

            val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(applicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            // Standard MIC with speakerphone captures both speaker output (lead) and caller's voice
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            recorder.setAudioEncodingBitRate(128000)
            recorder.setAudioSamplingRate(44100)
            recorder.setOutputFile(outputFile.absolutePath)
            recorder.prepare()
            recorder.start()

            mediaRecorder = recorder
            isRecording = true
            activeFile = outputFile
        } catch (e: Exception) {
            Log.e(TAG, "startMediaRecorder error: ${e.message}", e)
            isRecording = false
            mediaRecorder = null
            activeFile = null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "CRM Call Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows active status when CRM is recording call audio"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        stopSpeakerEnforcer()
        disableSpeakerphone(applicationContext)
        instance = null
        try {
            mediaRecorder?.apply {
                try { stop() } catch (e: Exception) {}
                release()
            }
        } catch (e: Exception) {}
        mediaRecorder = null
        isRecording = false
        super.onDestroy()
    }
}
