const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const pdf = require('pdf-parse');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());

// Configure multer for PDF uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Add OpenAI configuration
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Configure Socket.IO with proper CORS for frontend
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",  // This should be your frontend URL
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room ${room}`);
    });

    socket.on('send_message', (data) => {
        socket.to(data.room).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// PDF upload endpoint
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
    try {
        const pdfBuffer = req.file.buffer;
        const data = await pdf(pdfBuffer);
        res.json({ text: data.text });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process PDF' });
    }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, pdfContent } = req.body;
        
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant analyzing a PDF document. 
                    Answer questions concisely with a maximum of 10 sentences. 
                    Avoid long explanations or unnecessary details. 
                    Here's the content: ${pdfContent}`
                },
                {
                    role: "user",
                    content: message
                }
            ],
            max_tokens: 150,
        });

        const responseText = completion.data.choices[0].message.content;
        const trimmedResponse = responseText.split('. ').slice(0, 5).join('. ') + '.';

        res.json({ response: trimmedResponse });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 