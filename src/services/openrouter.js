const API_URL = "https://openrouter.ai/api/v1/chat/completions";

async function chat(message) {
    const API_KEY = process.env.OPENROUTER_API_KEY;
    const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

    if (!API_KEY) {
        const error = new Error("OPENROUTER_API_KEY belum diatur.");
        error.statusCode = 500;
        error.publicMessage = "API key OpenRouter belum diatur.";
        throw error;
    }

    const systemPrompt = `
Kamu adalah Dea Imup.

Kamu adalah asisten AI yang cerdas, akurat, natural, ramah, dan mudah dipahami.

GAYA MENJAWAB:

Jawablah secara natural seperti percakapan biasa.

Jangan membuat setiap jawaban terlihat seperti dokumen.

Jangan menggunakan:
### heading
---
garis pemisah
• bullet dekoratif
**teks berlebihan**
emoji yang berlebihan

Gunakan format sederhana dan bersih.

Jika pertanyaan hanya membutuhkan satu atau dua kalimat, cukup jawab dengan satu atau dua kalimat.

Jika pertanyaan membutuhkan penjelasan panjang, gunakan beberapa paragraf pendek agar nyaman dibaca.

Gunakan daftar hanya jika memang diperlukan.

Gunakan tabel hanya jika tabel benar-benar membantu.

Jangan memaksakan format tertentu pada semua jawaban.

Contoh:

Pengguna:
"Siapa Prabowo Subianto?"

Jawaban yang diinginkan:

"Prabowo Subianto adalah politikus dan mantan perwira TNI Indonesia yang saat ini menjabat sebagai Presiden Republik Indonesia. Ia lahir di Jakarta pada 17 Oktober 1951.

Sebelum terjun ke dunia politik, Prabowo memiliki karier panjang di militer. Ia kemudian mendirikan Partai Gerindra dan aktif dalam politik nasional."

Bukan jawaban seperti:

### Profil
---
• Nama:
• Tempat lahir:
• Jabatan:

AKURASI:

Jangan pernah mengarang fakta.

Jangan menebak jika tidak yakin.

Jika sebuah fakta penting atau bisa berubah, lakukan web search untuk memverifikasinya.

Gunakan web search terutama untuk:
berita terbaru,
politik,
tokoh publik,
jabatan seseorang,
tanggal,
tempat lahir,
angka atau statistik,
harga,
produk,
software,
dan informasi yang sedang berubah.

Untuk informasi faktual, utamakan sumber resmi dan sumber terpercaya.

Jika menemukan informasi yang berbeda dari beberapa sumber, jelaskan perbedaannya secara objektif.

Jika fakta belum dapat dipastikan, katakan bahwa informasi tersebut belum dapat dipastikan.

POLITIK:

Untuk pertanyaan politik, berikan informasi secara netral dan faktual.

Jangan mendukung atau menyerang kandidat, partai, atau pejabat.

Jangan memberikan ranking atau menentukan siapa yang terbaik.

Bedakan fakta, klaim, dan opini.

WEB SEARCH:

Gunakan web search ketika dibutuhkan untuk mendapatkan informasi yang lebih akurat atau terbaru.

Jangan mengarang sumber.

Jika menggunakan informasi dari web, gunakan sumber yang benar-benar tersedia dari hasil pencarian.

BAHASA:

Ikuti bahasa pengguna.

Jika pengguna menggunakan Bahasa Indonesia, jawab dalam Bahasa Indonesia.

Jika pengguna menggunakan bahasa Inggris, jawab dalam bahasa Inggris.

Jika pengguna menggunakan bahasa lain, ikuti bahasa tersebut.

GAYA KEPRIBADIAN:

Ramah.
Tenang.
Cerdas.
Tidak kaku.
Tidak bertele-tele.
Tidak menggurui.

Tujuan utama kamu adalah memberikan jawaban yang akurat dan terasa seperti percakapan dengan asisten AI modern.
`;

    const requestBody = {
        model: MODEL,

        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: message
            }
        ],

        tools: [
            {
                type: "openrouter:web_search",
                parameters: {
                    engine: "auto",
                    max_results: 5
                }
            }
        ],

        temperature: 0.2
    };

    const response = await fetch(API_URL, {
        method: "POST",

        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:3000",
            "X-Title": "Dea Imup"
        },

        body: JSON.stringify(requestBody)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error(
            "OpenRouter Error:",
            JSON.stringify(data, null, 2)
        );

        const error = new Error(
            data?.error?.message ||
            `OpenRouter HTTP ${response.status}`
        );

        error.statusCode = response.status;
        error.publicMessage =
            "Dea Imup gagal mendapatkan jawaban dari server AI.";

        throw error;
    }

    const choice = data?.choices?.[0];
    const modelMessage = choice?.message;

    let reply = "";

    if (typeof modelMessage?.content === "string") {
        reply = modelMessage.content;
    }

    if (
        !reply &&
        Array.isArray(modelMessage?.content)
    ) {
        reply = modelMessage.content
            .map(part => {
                if (typeof part === "string") {
                    return part;
                }

                return part?.text || "";
            })
            .join("");
    }

    if (
        !reply &&
        typeof choice?.text === "string"
    ) {
        reply = choice.text;
    }

    reply = reply.trim();

    if (!reply) {
        console.error(
            "Respons model:",
            JSON.stringify(data, null, 2)
        );

        const error = new Error(
            "Model tidak mengembalikan teks."
        );

        error.statusCode = 502;
        error.publicMessage =
            "Model AI tidak mengembalikan jawaban.";

        throw error;
    }

    return {
        reply: cleanReply(reply),
        sources: extractSources(data)
    };
}


/*
 * Membersihkan format berlebihan dari jawaban AI.
 */
function cleanReply(text) {
    return text
        .replace(/^#{1,6}\s*/gm, "")
        .replace(/^---+\s*$/gm, "")
        .replace(/^\s*[•●▪◦]\s*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}


/*
 * Mengambil sumber dari respons OpenRouter.
 */
function extractSources(data) {
    const sources = [];
    const used = new Set();

    const annotations =
        data?.choices?.[0]?.message?.annotations;

    if (Array.isArray(annotations)) {
        for (const item of annotations) {
            if (item?.type !== "url_citation") {
                continue;
            }

            const url = item?.url_citation?.url;

            if (!url || used.has(url)) {
                continue;
            }

            used.add(url);

            sources.push({
                title:
                    item?.url_citation?.title ||
                    url,
                url
            });
        }
    }

    return sources.slice(0, 8);
}


module.exports = {
    chat
};
