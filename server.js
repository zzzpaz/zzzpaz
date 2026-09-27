const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const path = require("path");
const { chat } = require("./src/services/openrouter");

const app = express();
const PORT = Number(process.env.PORT || 8000);

// Middleware
app.use(express.json({ limit: "1mb" }));

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "ZEA AI backend aktif!",
        provider: "OpenRouter",
        webSearch: true
    });
});

// Chat
app.post("/api/chat", async (req, res) => {
    try {
        const message = String(req.body?.message || "").trim();

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Pesan tidak boleh kosong."
            });
        }

        console.log("Pesan:", message);

        const result = await chat(message);

        return res.json({
            success: true,
            reply: result.reply,
            sources: result.sources || []
        });

    } catch (error) {
        console.error("ERROR:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.publicMessage || "ZEA AI mengalami masalah.",
            error: error.message
        });
    }
});

// Jalankan server
app.listen(PORT, "127.0.0.1", () => {
    console.log("");
    console.log("=================================");
    console.log("        ZEA AI BACKEND");
    console.log("=================================");
    console.log(`Server: http://127.0.0.1:${PORT}`);
    console.log(`API:    http://127.0.0.1:${PORT}/api/chat`);
    console.log("Web Search: aktif");
    console.log("=================================");
    console.log("");
});
