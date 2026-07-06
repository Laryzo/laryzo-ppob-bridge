require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ENDPOINT 1: Menerima orderan dari Aplikasi Laryzo (Frontend)
app.post('/api/create-ppob', async (req, res) => {
    try {
        const { buyer_phone, product_id, customer_id } = req.body;
        
        // Buat signature MD5 untuk Digiflazz
        const sign = crypto.createHash('md5').update(process.env.DIGIFLAZZ_USERNAME + process.env.DIGIFLAZZ_KEY + buyer_phone).digest('hex');
        
        const payload = {
            commands: "msisdn-check", // atau sesuai perintah Digiflazz
            username: process.env.DIGIFLAZZ_USERNAME,
            buyer_phone: buyer_phone,
            sign: sign
        };

        // Kirim ke Digiflazz (Sandbox/Production)
        const response = await axios.post('https://api.digiflazz.com/v1/cek-harga', payload); // Sesuaikan URL endpoint Digiflazz
        
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ENDPOINT 2: Menerima Callback (Notifikasi Sukses) dari Digiflazz
app.post('/api/callback-digiflazz', async (req, res) => {
    try {
        const { status, ref_id, message } = req.body;
        
        // Jika transaksi sukses, update database Supabase
        if (status === 'Success') {
            const { error } = await supabase
                .from('ppob_transactions') // Sesuaikan nama tabel Anda
                .update({ status: 'SUCCESS', message: message })
                .eq('reference_id', ref_id);
                
            if (error) console.error('Supabase error:', error);
            else console.log('Transaksi sukses diupdate ke Supabase!');
        }
        
        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send('Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Laryzo PPOB Bridge running on port ${PORT}`);
});
