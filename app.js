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

// ==== VARIABEL GLOBAL PERHITUNGAN ====
let totalAkhirGlobal = 0;
let nominalDiskonGlobal = 0;
let uangBayarGlobal = 0;
let uangKembalianGlobal = 0;

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

// ==== RENDER MENU BERURUTAN A - Z & SEARCH ====
searchInput.oninput = () => renderMenu();
function renderMenu() {
    const key = searchInput.value.toLowerCase();
    menuList.innerHTML = "";
    
    const barangTerurut = barang
        .filter(b => b.nama.toLowerCase().includes(key))
        .sort((a, b) => a.nama.localeCompare(b.nama));

    barangTerurut.forEach(b => {
        const d = document.createElement("div");
        d.className = "card card-menu";
        d.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 1.05em; color: #f8fafc; display: block; margin-bottom: 4px;">${b.nama}</strong>
                    <span style="color:#10b981; font-weight: 700; font-size: 1em;">Rp${Number(b.harga).toLocaleString('id-ID')}</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-add" onclick="tambahKeCart('${b.id}')">🛒 Tambah</button>
                    <button class="btn-action-small" onclick="editBarang('${b.id}')">✏️</button>
                    <button class="btn-action-small" onclick="hapusBarang('${b.id}')" style="color: #ef4444;">🗑️</button>
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
        let hargaEfektif = c.harga;
        if (c.nama.toLowerCase().includes("kresek") && c.qty >= 5) {
            hargaEfektif = 5500;
        }

        const subtotalItem = hargaEfektif * c.qty;
        t += subtotalItem;

        const d = document.createElement("div");
        d.className = "cart-item";
        d.innerHTML = `
            <div style="max-width: 60%;">
                <span style="font-weight: 600; color: #f1f5f9; display:block; font-size:0.95em;">${c.nama}</span>
                <small style="color: #94a3b8; font-size: 0.8em; display:inline-flex; align-items:center; gap:6px; margin-top:2px;">
                    ${c.qty} x Rp${hargaEfektif.toLocaleString('id-ID')} 
                    ${hargaEfektif < c.harga ? '<span class="badge-grosir">Grosir</span>' : ''}
                </small>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button class="qty-btn" onclick="updateQty(${i}, -1)">-</button>
                <span style="font-weight: 700; min-width: 20px; text-align: center; color: #fff;">${c.qty}</span>
                <button class="qty-btn" onclick="updateQty(${i}, 1)">+</button>
            </div>
        `;
        cartList.appendChild(d);
    });
    
    window.totalKotorCart = t; 
    window.hitungKembalian();
}

window.hitungKembalian = () => {
    const t = window.totalKotorCart || 0;
    const potonganRupiah = Number(document.getElementById("diskon").value.replace(/\D/g, "")) || 0;
    
    nominalDiskonGlobal = potonganRupiah;
    totalAkhirGlobal = t - nominalDiskonGlobal;
    if(totalAkhirGlobal < 0) totalAkhirGlobal = 0;

    if (nominalDiskonGlobal > 0) {
        totalDisplay.innerHTML = `<span style="font-size:0.65em; text-decoration:line-through; color:#ef4444; margin-right:8px; font-weight:400;">Rp${t.toLocaleString('id-ID')}</span>Total: Rp${totalAkhirGlobal.toLocaleString('id-ID')}`;
    } else {
        totalDisplay.innerText = `Total: Rp${t.toLocaleString('id-ID')}`;
    }

    const b = Number(bayarInput.value.replace(/\D/g, "")) || 0;
    uangBayarGlobal = b;
    const sisa = b - totalAkhirGlobal;
    uangKembalianGlobal = sisa >= 0 ? sisa : 0;
    
    if(bayarInput.value === "") {
        kembalianDisplay.innerText = "Kembalian: Rp0";
        kembalianDisplay.style.background = "rgba(255,255,255,0.02)";
        kembalianDisplay.style.color = "#64748b";
    } else if(sisa >= 0) {
        kembalianDisplay.innerText = `Kembalian: Rp${sisa.toLocaleString('id-ID')}`;
        kembalianDisplay.style.background = "rgba(16, 185, 129, 0.12)";
        kembalianDisplay.style.color = "#10b981";
    } else {
        kembalianDisplay.innerText = `Kurang: Rp${Math.abs(sisa).toLocaleString('id-ID')}`;
        kembalianDisplay.style.background = "rgba(239, 68, 68, 0.12)";
        kembalianDisplay.style.color = "#ef4444";
    }
};

// ==== TRANSAKSI SELESAI ====
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

// ==== PRINT STRUK CASIR THERMAL WITH TUNAI & KEMBALIAN (ANDRIOD FRIENDLY) ====
window.printStruk = () => {
    if(cart.length === 0) return alert("Keranjang kosong!");
    
    const tglSekarang = new Date();
    const yyyy = tglSekarang.getFullYear();
    const mm = String(tglSekarang.getMonth() + 1).padStart(2, '0');
    const dd = String(tglSekarang.getDate()).padStart(2, '0');
    const nomorStruk = `TRX-${yyyy}${mm}${dd}-${String(Date.now()).slice(-4)}`;
    
    let totalKotorStruk = 0;
    let itemRows = "";
    
    cart.forEach(i => {
        let hargaEfektif = i.harga;
        if (i.nama.toLowerCase().includes("kresek") && i.qty >= 5) {
            hargaEfektif = 5500;
        }
        
        const subtotal = hargaEfektif * i.qty;
        totalKotorStruk += subtotal;

        itemRows += `
            <div class="item-block">
                <div class="item-name">${i.nama} ${hargaEfektif < i.harga ? '(Grosir)' : ''}</div>
                <div class="item-detail">
                    <span>${i.qty} pcs x ${hargaEfektif.toLocaleString('id-ID')}</span>
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
                
                .calc-table { width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 4px; }
                .calc-table td { padding: 2px 0; }
                
                .no-print { 
                    background: #0ea5e9; color: white; border: none; padding: 12px; 
                    width: 100%; border-radius: 6px; font-weight: bold; 
                    margin-bottom: 12px; cursor: pointer; font-family: sans-serif; font-size: 14px;
                }
                @media print { .no-print { display: none !important; } body { width: 100%; } }
            </style>
        </head>
        <body>
            <button class="no-print" onclick="window.print()">⚙️ KIRIM KE PRINTER</button>
            
            <div class="text-center">
                <strong style="font-size: 13px;">TOKO BERKAH</strong><br>
                <span style="font-size: 10px;">Jln. Pasar Lama no 64, Alun-Alun Tanjungsari, Sumedang</span><br>
                <span style="font-size: 10px;">Telp: 085222326637</span>
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
                ${nominalDiskonGlobal > 0 ? `
                <tr>
                    <td>Subtotal:</td>
                    <td style="text-align: right;">${totalKotorStruk.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                    <td>Potongan Harga:</td>
                    <td style="text-align: right;">-${nominalDiskonGlobal.toLocaleString('id-ID')}</td>
                </tr>
                ` : ''}
                <tr class="bold" style="font-size: 12px;">
                    <td>TOTAL AKHIR:</td>
                    <td style="text-align: right;">${totalAkhirGlobal.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                    <td>TUNAI/BAYAR:</td>
                    <td style="text-align: right;">${uangBayarGlobal.toLocaleString('id-ID')}</td>
                </tr>
                <tr class="bold">
                    <td>KEMBALIAN:</td>
                    <td style="text-align: right;">${uangKembalianGlobal.toLocaleString('id-ID')}</td>
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
            </script>
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

// ==== NAV & UTILS WITH ACTIVE STATE STYLING ====
window.showMenuPage = () => { 
    document.getElementById("menuPage").style.display="block"; 
    document.getElementById("riwayatPage").style.display="none"; 
    document.getElementById("btnNavPenjualan").classList.add("active");
    document.getElementById("btnNavRiwayat").classList.remove("active");
};
window.showRiwayatPage = () => { 
    document.getElementById("menuPage").style.display="none"; 
    document.getElementById("riwayatPage").style.display="block"; 
    document.getElementById("btnNavPenjualan").classList.remove("active");
    document.getElementById("btnNavRiwayat").classList.add("active");
};
window.formatRupiah = (el) => {
    let v = el.value.replace(/\D/g, "");
    el.value = v ? Number(v).toLocaleString('id-ID') : "";
};
function renderRiwayat() {
    const rDiv = document.getElementById("riwayat");
    rDiv.innerHTML = "";
    riwayat.sort((a,b)=>b.timestamp-a.timestamp).forEach(r => {
        rDiv.innerHTML += `<div class="card" style="margin-bottom:8px; padding:12px 18px; display:flex; justify-content:space-between; align-items:center;"><span>📅 ${r.tanggal}</span> <strong style="color:#10b981">Rp${r.total.toLocaleString('id-ID')}</strong></div>`;
    });
}
function updateTotalHarian() {
    const tgl = new Date().toLocaleDateString('id-ID');
    const tot = riwayat.filter(r => r.tanggal === tgl).reduce((s, r) => s + r.total, 0);
    totalHarianDisplay.innerText = `Rp${tot.toLocaleString('id-ID')}`;
}
