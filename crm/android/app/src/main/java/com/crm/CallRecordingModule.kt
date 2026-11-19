package com.crm

import android.app.Activity
import android.content.ContentUris
import android.content.Intent
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.IOException

class CallRecordingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var pickPromise: Promise? = null
    private var mediaRecorder: MediaRecorder? = null
    private var currentRecordingFile: File? = null

    companion object {
        const val NAME = "CallRecordingModule"
        const val REQUEST_CODE_PICK_AUDIO = 9271
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    private data class CachedAudio(val uri: String, val name: String, val size: Long, val type: String)

    private data class FileCandidate(
        val uri: Uri,
        val name: String,
        val size: Long,
        val modTimeMs: Long,
        val mime: String
    )

    private fun getMimeTypeFromExtension(fileName: String): String {
        val ext = fileName.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "m4a", "mp4" -> "audio/mp4"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            "aac" -> "audio/aac"
            "3gp", "3gpp" -> "audio/3gpp"
            "amr" -> "audio/amr"
            "ogg", "opus" -> "audio/ogg"
            else -> "audio/m4a"
        }
    }

    private fun copyUriToCache(uri: Uri): CachedAudio {
        val contentResolver = reactApplicationContext.contentResolver
        var displayName = "recording_${System.currentTimeMillis()}.m4a"
        var size: Long = 0

        try {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (cursor.moveToFirst()) {
                    if (nameIndex != -1) {
                        val name = cursor.getString(nameIndex)
                        if (!name.isNullOrBlank()) displayName = name
                    }
                    if (sizeIndex != -1) {
                        size = cursor.getLong(sizeIndex)
                    }
                }
            }
        } catch (e: Exception) {
            // Fallback for file:// Uris
            if (uri.scheme == "file") {
                val f = File(uri.path ?: "")
                if (f.exists()) {
                    displayName = f.name
                    size = f.length()
                }
            }
        }

        val mimeType = contentResolver.getType(uri) ?: getMimeTypeFromExtension(displayName)
        val safeName = displayName.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
        val cacheFile = File(reactApplicationContext.cacheDir, "call_rec_${System.currentTimeMillis()}_$safeName")

        val inputStream = contentResolver.openInputStream(uri)
            ?: throw IOException("Could not open input stream for $uri")

        inputStream.use { input ->
            cacheFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }

        val finalSize = if (size > 0) size else cacheFile.length()

        return CachedAudio(
            uri = "file://${cacheFile.absolutePath}",
            name = safeName,
            size = finalSize,
            type = mimeType
        )
    }

    /**
     * Pick an audio file from system storage via Document / Audio Picker
     */
    @ReactMethod
    fun pickAudioFile(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "Current Android Activity is null")
            return
        }

        if (pickPromise != null) {
            try {
                pickPromise?.reject("E_CANCELLED", "New file picker request initiated")
            } catch (e: Exception) {}
            pickPromise = null
        }

        pickPromise = promise

        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "audio/*"
                addCategory(Intent.CATEGORY_OPENABLE)
                putExtra(Intent.EXTRA_LOCAL_ONLY, true)
                putExtra(
                    Intent.EXTRA_MIME_TYPES,
                    arrayOf(
                        "audio/*",
                        "audio/mp4",
                        "audio/m4a",
                        "audio/mpeg",
                        "audio/wav",
                        "audio/3gpp",
                        "audio/amr",
                        "audio/aac",
                        "audio/ogg",
                        "application/ogg"
                    )
                )
            }
            activity.startActivityForResult(
                Intent.createChooser(intent, "Select Call Recording"),
                REQUEST_CODE_PICK_AUDIO
            )
        } catch (e: Exception) {
            pickPromise?.reject("E_PICK_FAILED", "Failed to launch audio picker: ${e.message}", e)
            pickPromise = null
        }
    }

    /**
     * Scan device MediaStore and common Call Recording directories for the latest recording
     */
    @ReactMethod
    fun findRecentRecording(sinceTimestampMs: Double, promise: Promise) {
        Thread {
            try {
                // Buffer of 5 minutes before call start
                val sinceTime = (sinceTimestampMs.toLong() - 5 * 60 * 1000)
                val candidates = mutableListOf<FileCandidate>()

                // 1. Query MediaStore
                try {
                    val contentResolver = reactApplicationContext.contentResolver
                    val projection = arrayOf(
                        MediaStore.Audio.Media._ID,
                        MediaStore.Audio.Media.DISPLAY_NAME,
                        MediaStore.Audio.Media.DATE_ADDED,
                        MediaStore.Audio.Media.DATE_MODIFIED,
                        MediaStore.Audio.Media.SIZE,
                        MediaStore.Audio.Media.MIME_TYPE
                    )

                    val selection = "${MediaStore.Audio.Media.DATE_MODIFIED} >= ? OR ${MediaStore.Audio.Media.DATE_ADDED} >= ?"
                    val selectionArgs = arrayOf((sinceTime / 1000).toString(), (sinceTime / 1000).toString())
                    val sortOrder = "${MediaStore.Audio.Media.DATE_MODIFIED} DESC"

                    contentResolver.query(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        projection,
                        selection,
                        selectionArgs,
                        sortOrder
                    )?.use { cursor ->
                        val idCol = cursor.getColumnIndex(MediaStore.Audio.Media._ID)
                        val nameCol = cursor.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME)
                        val modCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_MODIFIED)
                        val sizeCol = cursor.getColumnIndex(MediaStore.Audio.Media.SIZE)
                        val mimeCol = cursor.getColumnIndex(MediaStore.Audio.Media.MIME_TYPE)

                        while (cursor.moveToNext()) {
                            val id = cursor.getLong(idCol)
                            val name = if (nameCol != -1) cursor.getString(nameCol) ?: "rec.m4a" else "rec.m4a"
                            val modSec = if (modCol != -1) cursor.getLong(modCol) else 0L
                            val size = if (sizeCol != -1) cursor.getLong(sizeCol) else 0L
                            val mime = if (mimeCol != -1) cursor.getString(mimeCol) ?: "audio/m4a" else "audio/m4a"
                            val contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)

                            if (size > 1024) {
                                candidates.add(
                                    FileCandidate(
                                        uri = contentUri,
                                        name = name,
                                        size = size,
                                        modTimeMs = modSec * 1000,
                                        mime = mime
                                    )
                                )
                            }
                        }
                    }
                } catch (e: Exception) {
                    // Handled gracefully if MediaStore query is restricted
                }

                // 2. Scan OEM specific call recording directories
                val searchDirs = listOf(
                    File(Environment.getExternalStorageDirectory(), "Recordings/Call"),
                    File(Environment.getExternalStorageDirectory(), "Recordings"),
                    File(Environment.getExternalStorageDirectory(), "MIUI/sound_recorder/call_rec"),
                    File(Environment.getExternalStorageDirectory(), "Sounds/Call"),
                    File(Environment.getExternalStorageDirectory(), "VoiceRecorder"),
                    File(Environment.getExternalStorageDirectory(), "CallRecordings"),
                    File(Environment.getExternalStorageDirectory(), "Music/Recordings"),
                    File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "")
                )

                val audioExtensions = setOf("m4a", "mp3", "wav", "3gp", "amr", "aac", "ogg", "opus")

                for (dir in searchDirs) {
                    try {
                        if (dir.exists() && dir.isDirectory) {
                            dir.listFiles()?.forEach { file ->
                                if (file.isFile && file.length() > 1024) {
                                    val ext = file.extension.lowercase()
                                    if (audioExtensions.contains(ext) && file.lastModified() >= sinceTime) {
                                        candidates.add(
                                            FileCandidate(
                                                uri = Uri.fromFile(file),
                                                name = file.name,
                                                size = file.length(),
                                                modTimeMs = file.lastModified(),
                                                mime = getMimeTypeFromExtension(file.name)
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    } catch (e: Exception) {
                        // Directory not readable or restricted
                    }
                }

                if (candidates.isEmpty()) {
                    promise.resolve(null)
                    return@Thread
                }

                // Pick the most recent audio candidate
                val newest = candidates.maxByOrNull { it.modTimeMs }!!
                val cached = copyUriToCache(newest.uri)

                val map = Arguments.createMap().apply {
                    putBoolean("found", true)
                    putString("uri", cached.uri)
                    putString("name", cached.name)
                    putDouble("size", cached.size.toDouble())
                    putString("type", cached.type)
                    putDouble("timestamp", newest.modTimeMs.toDouble())
                }
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("E_SEARCH_FAILED", e.message, e)
            }
        }.start()
    }

    /**
     * Start in-app microphone recording (for voice notes / call recap)
     */
    @ReactMethod
    fun startVoiceRecording(promise: Promise) {
        try {
            if (mediaRecorder != null) {
                try {
                    mediaRecorder?.stop()
                    mediaRecorder?.release()
                } catch (e: Exception) {}
                mediaRecorder = null
            }

            val file = File(reactApplicationContext.cacheDir, "call_note_${System.currentTimeMillis()}.m4a")
            currentRecordingFile = file

            val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactApplicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            recorder.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(128000)
                setAudioSamplingRate(44100)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }

            mediaRecorder = recorder
            val map = Arguments.createMap().apply {
                putBoolean("recording", true)
                putString("path", file.absolutePath)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            mediaRecorder = null
            currentRecordingFile = null
            promise.reject("E_RECORD_START", "Failed to start recording: ${e.message}", e)
        }
    }

    /**
     * Stop in-app microphone recording and return cached file
     */
    @ReactMethod
    fun stopVoiceRecording(promise: Promise) {
        try {
            val recorder = mediaRecorder
            val file = currentRecordingFile
            if (recorder == null || file == null) {
                promise.reject("E_NO_RECORDING", "No active recording")
                return
            }

            try {
                recorder.stop()
            } catch (e: Exception) {
                // Stopped immediately
            }
            recorder.release()
            mediaRecorder = null
            currentRecordingFile = null

            if (!file.exists() || file.length() == 0L) {
                promise.reject("E_EMPTY_RECORDING", "Recording file is empty")
                return
            }

            val map = Arguments.createMap().apply {
                putString("uri", "file://${file.absolutePath}")
                putString("name", file.name)
                putDouble("size", file.length().toDouble())
                putString("type", "audio/m4a")
            }
            promise.resolve(map)
        } catch (e: Exception) {
            mediaRecorder = null
            currentRecordingFile = null
            promise.reject("E_RECORD_STOP", "Failed to stop recording: ${e.message}", e)
        }
    }

    /**
     * Cancel ongoing microphone recording and delete file
     */
    @ReactMethod
    fun cancelVoiceRecording(promise: Promise) {
        try {
            mediaRecorder?.apply {
                try { stop() } catch (e: Exception) {}
                release()
            }
            mediaRecorder = null
            currentRecordingFile?.delete()
            currentRecordingFile = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE_PICK_AUDIO) {
            val promise = pickPromise ?: return
            pickPromise = null

            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val uri = data.data!!
                Thread {
                    try {
                        val cached = copyUriToCache(uri)
                        val map = Arguments.createMap().apply {
                            putBoolean("cancelled", false)
                            putString("uri", cached.uri)
                            putString("name", cached.name)
                            putDouble("size", cached.size.toDouble())
                            putString("type", cached.type)
                        }
                        promise.resolve(map)
                    } catch (e: Exception) {
                        promise.reject("E_CACHE_FAILED", "Failed to copy audio: ${e.message}", e)
                    }
                }.start()
            } else {
                val map = Arguments.createMap().apply {
                    putBoolean("cancelled", true)
                }
                promise.resolve(map)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {}
}
