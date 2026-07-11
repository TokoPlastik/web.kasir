import { db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from './firebase.js';

// DOM Elements
const menuList = document.getElementById("menuList");
const cartList = document.getElementById("cartList");
const totalDisplay = document.getElementById("total");
const totalHarianDisplay = document.getElementById("totalHarian");
const kembalianDisplay = document.getElementById("kembalian");
const searchInput = document.getElementById("search");
const bayarInput = document.getElementById("bayar");

let barang = []; let cart = []; let riwayat = [];

// ==== VARIABEL GLOBAL UNTUK DISKON ====
let totalAkhirGlobal = 0;
let nominalDiskonGlobal = 0;

// ==== AUTH LOGIC ====
window.login = () => {
    const u = document.getElementById("username").value;
    const p = document.getElementById("password").value;
    
    if(u === "admin" && p === "123") {
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("app").style.display = "block";
        initRealtime();
    } else {
        alert("❌ Username atau Password salah!");
    }
};

document.getElementById("btnLogin").addEventListener("click", window.login);
document.getElementById("password").addEventListener("keypress", (e) => {
    if (e.key === "Enter") window.login();
});

// ==== FIREBASE REALTIME ====
function initRealtime() {
    onSnapshot(collection(db, "barang"), (s) => {
        barang = s.docs.map(d => ({ id: d.id, ...d.data() }));
        renderMenu();
    });
    onSnapshot(collection(db, "riwayat"), (s) => {
        riwayat = s.docs.map(d => ({ id: d.id, ...d.data() }));
        renderRiwayat();
        updateTotalHarian();
    });
}

// ==== RENDER MENU & SEARCH ====
searchInput.oninput = () => renderMenu();
function renderMenu() {
    const key = searchInput.value.toLowerCase();
    menuList.innerHTML = "";
    barang.filter(b => b.nama.toLowerCase().includes(key)).forEach(b => {
        const d = document.createElement("div");
        d.className = "card";
        d.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 1.1em;">${b.nama}</strong><br>
                    <span style="color:#10b981; font-weight: 600;">Rp${Number(b.harga).toLocaleString('id-ID')}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-add" onclick="tambahKeCart('${b.id}')">🛒 Tambah</button>
                    <button onclick="editBarang('${b.id}')" style="background:#3b82f6; color:white; border:none; padding:8px; border-radius:8px; cursor:pointer;">✏️</button>
                    <button class="btn-delete" onclick="hapusBarang('${b.id}')">🗑️</button>
                </div>
            </div>
        `;
        menuList.appendChild(d);
    });
}

// ==== EDIT BARANG ====
window.editBarang = async (id) => {
    const item = barang.find(x => x.id === id);
    const hargaBaru = prompt(`Edit harga untuk: ${item.nama}\nMasukkan angka saja:`, item.harga);
    
    if (hargaBaru !== null && hargaBaru !== "" && !isNaN(hargaBaru.replace(/\./g, ""))) {
        try {
            await updateDoc(doc(db, "barang", id), { 
                harga: Number(hargaBaru.replace(/\./g, "")) 
            });
            alert("✅ Harga diperbarui!");
        } catch (e) { alert("Gagal: " + e.message); }
    }
};

// ==== CART LOGIC ====
window.tambahKeCart = (id) => {
    const b = barang.find(x => x.id === id);
    const ada = cart.find(x => x.id === id);
    if(ada) ada.qty++; else cart.push({...b, qty: 1});
    renderCart();
};

window.updateQty = (i, delta) => {
    cart[i].qty += delta;
    if(cart[i].qty <= 0) cart.splice(i, 1);
    renderCart();
};

function renderCart() {
    cartList.innerHTML = "";
    let t = 0;
    cart.forEach((c, i) => {
        t += c.harga * c.qty;
        const d = document.createElement("div");
        d.className = "cart-item";
        d.innerHTML = `
            <span>${c.nama}</span>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button class="qty-btn" onclick="updateQty(${i}, -1)">-</button>
                <span>${c.qty}</span>
                <button class="qty-btn" onclick="updateQty(${i}, 1)">+</button>
            </div>
        `;
        cartList.appendChild(d);
    });
    totalDisplay.innerText = `Total: Rp${t.toLocaleString('id-ID')}`;
    window.hitungKembalian();
}

window.hitungKembalian = () => {
    const t = cart.reduce((s, i) => s + (i.harga * i.qty), 0);
    const diskonPersen = Number(document.getElementById("diskon").value) || 0;
    
    nominalDiskonGlobal = (t * diskonPersen) / 100;
    totalAkhirGlobal = t - nominalDiskonGlobal;

    if (diskonPersen > 0) {
        totalDisplay.innerHTML = `<span style="font-size:0.7em; text-decoration:line-through; color:#ef4444;">Rp${t.toLocaleString('id-ID')}</span> Total: Rp${totalAkhirGlobal.toLocaleString('id-ID')}`;
    } else {
        totalDisplay.innerText = `Total: Rp${t.toLocaleString('id-ID')}`;
    }

    const b = Number(bayarInput.value.replace(/\D/g, "")) || 0;
    const sisa = b - totalAkhirGlobal;
    
    kembalianDisplay.innerText = sisa >= 0 ? `Kembalian: Rp${sisa.toLocaleString('id-ID')}` : `Kurang: Rp${Math.abs(sisa).toLocaleString('id-ID')}`;
    kembalianDisplay.style.background = sisa >= 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)";
    kembalianDisplay.style.color = sisa >= 0 ? "#10b981" : "#ef4444";
};

// ==== TRANSAKSI ====
window.selesaiTransaksi = async () => {
    if(cart.length === 0) return alert("Keranjang kosong!");
    const bayar = Number(bayarInput.value.replace(/\D/g, "")) || 0;
    if(bayar < totalAkhirGlobal) return alert("Pembayaran kurang!");
    
    await addDoc(collection(db, "riwayat"), { 
        total: totalAkhirGlobal, 
        diskon: nominalDiskonGlobal,
        tanggal: new Date().toLocaleDateString('id-ID'),
        timestamp: Date.now() 
    });
    
    cart = []; 
    bayarInput.value = ""; 
    document.getElementById("diskon").value = "";
    renderCart();
    alert("✅ Transaksi Berhasil!");
};

// ==== PRINT STRUK THERMAL PRO ====
window.printStruk = () => {
    if(cart.length === 0) return alert("Keranjang kosong!");
    
    const tglSekarang = new Date();
    const yyyy = tglSekarang.getFullYear();
    const mm = String(tglSekarang.getMonth() + 1).padStart(2, '0');
    const dd = String(tglSekarang.getDate()).padStart(2, '0');
    const nomorStruk = `TRX-${yyyy}${mm}${dd}-${String(Date.now()).slice(-4)}`;
    
    const totalKotor = cart.reduce((s, i) => s + (i.harga * i.qty), 0);
    const diskonPersen = Number(document.getElementById("diskon").value) || 0;

    let itemRows = "";
    cart.forEach(i => {
        const subtotal = i.harga * i.qty;
        itemRows += `
            <div class="item-block">
                <div class="item-name">${i.nama}</div>
                <div class="item-detail">
                    <span>${i.qty} pcs x ${i.harga.toLocaleString('id-ID')}</span>
                    <span>${subtotal.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });

    const shortcutHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Print Struk</title>
            <style>
                @page { size: 58mm auto; margin: 0; }
                html, body { margin: 0; padding: 0; background: #fff; color: #000; }
                body { 
                    font-family: 'Courier New', Courier, monospace; 
                    width: 58mm; 
                    padding: 4px 8px 30px 8px; 
                    font-size: 12px; 
                    line-height: 1.2;
                    box-sizing: border-box;
                }
                .text-center { text-align: center; }
                .bold { font-weight: bold; }
                .line-equal { letter-spacing: -1px; margin: 3px 0; font-weight: bold; }
                .line-dashed { border-top: 1px dashed #000; margin: 5px 0; }
                
                .meta-table { width: 100%; font-size: 11px; margin: 4px 0; border-collapse: collapse; }
                .item-block { margin-bottom: 6px; page-break-inside: avoid; }
                .item-name { font-size: 12px; }
                .item-detail { display: flex; justify-content: space-between; font-size: 11px; padding-left: 8px; }
                
                .calc-table { width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 4px; }
                .calc-table td { padding: 1px 0; }
                
                .no-print { 
                    background: #0ea5e9; color: white; border: none; padding: 10px; 
                    width: 100%; border-radius: 6px; font-weight: bold; 
                    margin-bottom: 10px; cursor: pointer; font-family: sans-serif; font-size: 14px;
                }
                @media print { .no-print { display: none !important; } body { width: 100%; } }
            </style>
        </head>
        <body>
            <button class="no-print" onclick="window.print()">⚙️ KIRIM KE PRINTER</button>
            
            <div class="text-center">
                <strong style="font-size: 13px;">TOKO PLASTIK PASAR LAMA</strong><br>
                <span style="font-size: 10px;">Jln. Pasar Lama, Area Pasar Tradisional</span><br>
                <span style="font-size: 10px;">Telp: 085XXXXXXXXX</span>
            </div>
            
            <div class="line-equal">==============================</div>
            
            <table class="meta-table">
                <tr>
                    <td>No: <span class="bold">${nomorStruk}</span></td>
                    <td style="text-align: right;">Kasir: <span class="bold">Admin</span></td>
                </tr>
                <tr>
                    <td>Tgl: ${dd}/${mm}/${yyyy} ${String(tglSekarang.getHours()).padStart(2, '0')}:${String(tglSekarang.getMinutes()).padStart(2, '0')}</td>
                    <td style="text-align: right;">Jenis: <span class="bold">Tunai</span></td>
                </tr>
            </table>
            
            <div class="line-dashed"></div>
            
            <div class="items-container">${itemRows}</div>
            
            <div class="line-dashed"></div>
            
            <table class="calc-table">
                ${diskonPersen > 0 ? `
                <tr>
                    <td>Subtotal:</td>
                    <td style="text-align: right;">${totalKotor.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                    <td>Diskon (${diskonPersen}%):</td>
                    <td style="text-align: right;">-${nominalDiskonGlobal.toLocaleString('id-ID')}</td>
                </tr>
                ` : ''}
                <tr class="bold" style="font-size: 13px;">
                    <td>TOTAL AKHIR:</td>
                    <td style="text-align: right;">${totalAkhirGlobal.toLocaleString('id-ID')}</td>
                </tr>
            </table>
            
            <div class="line-dashed"></div>
            
            <div class="text-center" style="margin-top: 10px; font-size: 10px; letter-spacing: 0.5px;">
                Terima Kasih<br>
                Selamat Belanja Kembali
            </div>

            <script>
                window.onload = () => {
                    setTimeout(() => { window.print(); }, 400);
                };
            <\/script>
        </body>
        </html>
    `;

    const w = window.open('', '_blank');
    w.document.write(shortcutHtml);
    w.document.close();
};

// ==== CRUD BARANG ====
window.tambahBarang = async () => {
    const n = document.getElementById("nama").value;
    const h = Number(document.getElementById("harga").value.replace(/\D/g, ""));
    if(n && h) {
        await addDoc(collection(db, "barang"), { nama: n, harga: h });
        document.getElementById("nama").value = ""; 
        document.getElementById("harga").value = "";
    }
};

window.hapusBarang = async (id) => { if(confirm("Hapus barang dari database?")) await deleteDoc(doc(db, "barang", id)); };

window.clearRiwayat = async () => {
    if(confirm("Hapus semua riwayat permanen?")) {
        for(const r of riwayat) await deleteDoc(doc(db, "riwayat", r.id));
    }
};

// ==== NAV & UTILS ====
window.showMenuPage = () => { document.getElementById("menuPage").style.display="block"; document.getElementById("riwayatPage").style.display="none"; };
window.showRiwayatPage = () => { document.getElementById("menuPage").style.display="none"; document.getElementById("riwayatPage").style.display="block"; };
window.formatRupiah = (el) => {
    let v = el.value.replace(/\D/g, "");
    el.value = v ? Number(v).toLocaleString('id-ID') : "";
};
function renderRiwayat() {
    const rDiv = document.getElementById("riwayat");
    rDiv.innerHTML = "";
    riwayat.sort((a,b)=>b.timestamp-a.timestamp).forEach(r => {
        rDiv.innerHTML += `<div class="card">📅 ${r.tanggal} - <span style="color:#10b981">Rp${r.total.toLocaleString('id-ID')}</span></div>`;
    });
}
function updateTotalHarian() {
    const tgl = new Date().toLocaleDateString('id-ID');
    const tot = riwayat.filter(r => r.tanggal === tgl).reduce((s, r) => s + r.total, 0);
    totalHarianDisplay.innerText = `Rp${tot.toLocaleString('id-ID')}`;
}
