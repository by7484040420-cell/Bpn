package com.bipinai.chat

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Saves the user's own details (name, DOB, mobile, email, Aadhaar ...) ON THIS
 * PHONE ONLY, encrypted with an AES-256 key that lives in the Android Keystore
 * (the key never leaves the device and cannot be read by other apps).
 *
 * Nothing here is ever sent to a server.
 */
object ProfileStore {

    /** key -> label shown to the user. Order = order in the form. */
    val LABELS: Map<String, String> = linkedMapOf(
        "firstName" to "First name",
        "middleName" to "Middle name",
        "lastName" to "Last name",
        "fatherName" to "Father's name",
        "dob" to "Date of birth",
        "mobile" to "Mobile number",
        "email" to "Email",
        "aadhaar" to "Aadhaar number"
    )

    private const val PREFS = "bipin_profile"
    private const val PREF_KEY = "data"
    private const val KEY_ALIAS = "bipin_profile_key"
    private const val IV_SIZE = 12

    fun load(context: Context): Map<String, String> {
        val stored = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(PREF_KEY, null) ?: return emptyMap()
        return try {
            val raw = Base64.decode(stored, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, raw, 0, IV_SIZE))
            val plain = cipher.doFinal(raw, IV_SIZE, raw.size - IV_SIZE)
            val json = JSONObject(String(plain, Charsets.UTF_8))
            json.keys().asSequence().associateWith { json.getString(it) }
        } catch (e: Exception) {
            emptyMap()
        }
    }

    fun save(context: Context, values: Map<String, String>) {
        val json = JSONObject()
        for ((key, value) in values) {
            if (value.isNotBlank()) json.put(key, value.trim())
        }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val encrypted = cipher.doFinal(json.toString().toByteArray(Charsets.UTF_8))
        val out = cipher.iv + encrypted
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_KEY, Base64.encodeToString(out, Base64.NO_WRAP))
            .apply()
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore")
        keyStore.load(null)
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }
}
