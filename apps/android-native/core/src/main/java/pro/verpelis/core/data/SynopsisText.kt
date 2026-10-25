package pro.verpelis.core.data

/**
 * Sinopsis limpia para el celular (misma regla que heroSynopsis de la web):
 * sin markdown, sin bloques de reparto / dirección / doblaje, en tipo oración y,
 * si se pide [max], cortada por palabra con «…».
 */
object SynopsisText {
    private val CREDITS_START = Regex(
        """\*\*|(?:^|\n)[ \t]*(?:reparto|elenco|cast|starring|protagonistas|protagonizada por|dirigid[ao] por|direcci[oó]n|director(?:a)?|guion|música|país|estudio de|doblaje)\b""",
        RegexOption.IGNORE_CASE,
    )
    private val CREDITS_SENTENCE = Regex("""\b(?:reparto|starring)\b|\b(?:completan|encabezan|lideran|forman)\b[^.]*\belenco\b""", RegexOption.IGNORE_CASE)
    private val SENTENCE_BREAK = Regex("""(?<=[.!?…])\s+(?=[¡¿«"'(]*\p{Lu})""")
    private val INITIAL_END = Regex("""(?:^|[\s.])\p{Lu}\.$""")

    fun clean(raw: String?, max: Int = Int.MAX_VALUE): String {
        var text = raw.orEmpty()
        CREDITS_START.find(text)?.let { text = text.substring(0, it.range.first) }
        text = text.replace(Regex("[*_#]+"), " ").replace(Regex("\\s+"), " ").trim()
        // Frases; se vuelven a unir las cortadas tras una inicial («Samuel L. Jackson»).
        val parts = mutableListOf<String>()
        for (p in text.split(SENTENCE_BREAK)) {
            if (parts.isNotEmpty() && INITIAL_END.containsMatchIn(parts.last())) parts[parts.lastIndex] = parts.last() + " " + p
            else parts += p
        }
        text = parts.map { it.trim() }.filter { it.isNotEmpty() && !CREDITS_SENTENCE.containsMatchIn(it) }.joinToString(" ").trim()
        if (text.none { it.isLetter() }) return ""
        text = sentenceCase(text)
        if (text.length <= max) return text
        val head = text.substring(0, max)
        val end = maxOf(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "))
        if (end >= max * 0.55) return head.substring(0, end + 1)
        val space = head.lastIndexOf(' ')
        val base = (if (space > max * 0.5) head.substring(0, space) else head.substring(0, max - 1)).replace(Regex("[\\s,;:.\\-–—]+$"), "")
        return "$base…"
    }

    private fun sentenceCase(text: String): String {
        val letters = text.filter { it.isLetter() }
        var out = text
        if (letters.length >= 12 && letters.count { it.isUpperCase() }.toFloat() / letters.length > 0.8f) {
            out = text.lowercase(java.util.Locale("es")).replace(Regex("""(^|[.!?¡¿]\s+)(\p{Ll})""")) { it.groupValues[1] + it.groupValues[2].uppercase() }
        }
        return out.replace(Regex("""^([¡¿«"'(]*)(\p{Ll})""")) { it.groupValues[1] + it.groupValues[2].uppercase() }
    }
}
