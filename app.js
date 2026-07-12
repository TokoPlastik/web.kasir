import { db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from './firebase.js';

// DOM Elements
const menuList = document.getElementById("menuList");
const cartList = document.getElementById("cartList");
const totalDisplay = document.getElementById("total");
const totalHarianDisplay = document.getElementById("totalHarian");
const kembalianDisplay = document.getElementById("kembalian");
const searchInput = document.getElementById("search");
const bayarInput = document.getElementById("bayar");
const diskonInput = document.getElementById("diskon");

let barang = []; let cart = []; let riwayat = [];

// ==== VARIABEL GLOBAL PERHITUNGAN LENGKAP ====
let totalKotorGlobal = 0;
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
    
    // Urutan Alfabet Otomatis A - Z
    const barangTerurut = barang
        .filter(b => b.nama.toLowerCase().includes(key))
        .sort((a, b) => a.nama.localeCompare(b.nama));

    barangTerurut.forEach(b => {
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
        // AMBIL FITUR ASLI: Aturan Grosir Khusus Kresek >= 5 Pcs Otomatis Rp5.500
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
                <span style="font-weight:600; display:block;">${c.nama}</span>
                <small style="color: #94a3b8;">
                    ${c.qty} x Rp${hargaEfektif.toLocaleString('id-ID')}
                    ${hargaEfektif < c.harga ? '<span class="badge-grosir">Grosir</span>' : ''}
                </small>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button class="qty-btn" onclick="updateQty(${i}, -1)">-</button>
                <span style="font-weight: 600; min-width: 15px; text-align: center;">${c.qty}</span>
                <button class="qty-btn" onclick="updateQty(${i}, 1)">+</button>
            </div>
        `;
        cartList.appendChild(d);
    });
    
    totalKotorGlobal = t;
    window.hitungKembalian();
}

window.hitungKembalian = () => {
    const potonganRupiah = Number(diskonInput.value.replace(/\D/g, "")) || 0;
    nominalDiskonGlobal = potonganRupiah;
    
    totalAkhirGlobal = totalKotorGlobal - nominalDiskonGlobal;
    if (totalAkhirGlobal < 0) totalAkhirGlobal = 0;

    // Tampilkan Coretan Total Kotor Jika Ada Diskon
    if (nominalDiskonGlobal > 0) {
        totalDisplay.innerHTML = `<span style="font-size:0.7em; text-decoration:line-through; color:#ef4444; margin-right:10px; font-weight:400;">Rp${totalKotorGlobal.toLocaleString('id-ID')}</span>Total: Rp${totalAkhirGlobal.toLocaleString('id-ID')}`;
    } else {
        totalDisplay.innerText = `Total: Rp${totalAkhirGlobal.toLocaleString('id-ID')}`;
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
        kembalianDisplay.style.background = "rgba(16, 185, 129, 0.2)";
        kembalianDisplay.style.color = "#10b981";
    } else {
        kembalianDisplay.innerText = `Kurang: Rp${Math.abs(sisa).toLocaleString('id-ID')}`;
        kembalianDisplay.style.background = "rgba(239, 68, 68, 0.2)";
        kembalianDisplay.style.color = "#ef4444";
    }
};

// ==== TRANSAKSI ====
window.selesaiTransaksi = async () => {
    if(cart.length === 0) return alert("Keranjang kosong!");
    if(uangBayarGlobal < totalAkhirGlobal) return alert("Nominal pembayaran kurang!");
    
    await addDoc(collection(db, "riwayat"), { 
        total: totalAkhirGlobal, 
        diskon: nominalDiskonGlobal,
        tanggal: new Date().toLocaleDateString('id-ID'),
        timestamp: Date.now() 
    });
    
    cart = []; 
    bayarInput.value = ""; 
    diskonInput.value = "";
    renderCart();
    alert("✅ Transaksi Berhasil!");
};

// ==== PRINT STRUK PREMIUM (SESUAI CONTOH KASIR ASLI) ====
window.printStruk = () => {
    if(cart.length === 0) return alert("Keranjang kosong!");
    
    const tgl = new Date();
    const tglString = `${String(tgl.getDate()).padStart(2, '0')}-${String(tgl.getMonth() + 1).padStart(2, '0')}-${tgl.getFullYear()}`;
    const jamString = `${String(tgl.getHours()).padStart(2, '0')}:${String(tgl.getMinutes()).padStart(2, '0')}`;
    const noStruk = `TRX-${tgl.getFullYear()}${String(tgl.getMonth()+1).padStart(2, '0')}${String(tgl.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
    
    let itemRows = "";
    cart.forEach(i => {
        let hargaEfektif = i.harga;
        if (i.nama.toLowerCase().includes("kresek") && i.qty >= 5) {
            hargaEfektif = 5500;
        }
        const subtotal = hargaEfektif * i.qty;

        itemRows += `
            <div style="margin-bottom: 5px;">
                <div>${i.nama} ${hargaEfektif < i.harga ? '(Grosir)' : ''}</div>
                <div style="display: flex; justify-content: space-between; padding-left: 10px; font-size: 11px;">
                    <span>${i.qty} pcs x ${hargaEfektif.toLocaleString('id-ID')}</span>
                    <span>${subtotal.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });

    const strukHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cetak Struk</title>
            <style>
                @page { size: 58mm auto; margin: 0; }
                body { font-family: 'Courier New', Courier, monospace; width: 58mm; padding: 5px 8px; font-size: 12px; color: #000; background: #fff; margin: 0; box-sizing: border-box; }
                .text-center { text-align: center; }
                .divider { border-top: 1px dashed #000; margin: 6px 0; }
                .flex-space { display: flex; justify-content: space-between; }
                .btn-print { display: block; width: 100%; background: #0ea5e9; color: white; border: none; padding: 10px; font-weight: bold; margin-bottom: 10px; border-radius: 5px; cursor: pointer; font-family: sans-serif; }
                @media print { .btn-print { display: none; } }
            </style>
        </head>
        <body>
            <button class="btn-print" onclick="window.print()">KIRIM KE PRINTER THERMAL</button>
            <div class="text-center">
                <strong style="font-size: 14px;">TOKO BERKAH</strong><br>
                <span style="font-size: 10px;">Jln.pasar lama no 64, Alun-Alun Tanjungsari, Sumedang</span><br>
                <span style="font-size: 10px;">Telp: 085222326637</span>
            </div>
            <div class="divider"></div>
            <div style="font-size: 11px;">
                <div class="flex-space"><span>No. Struk: ${noStruk}</span><span>Kasir: Admin</span></div>
                <div class="flex-space"><span>Tgl: ${tglString} ${jamString}</span><span>Jenis: Tunai</span></div>
            </div>
            <div class="divider"></div>
            <div>${itemRows}</div>
            <div class="divider"></div>
            
            ${nominalDiskonGlobal > 0 ? `
            <div class="flex-space">
                <span>Subtotal:</span>
                <span>${totalKotorGlobal.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex-space">
                <span>Potongan Harga:</span>
                <span>-${nominalDiskonGlobal.toLocaleString('id-ID')}</span>
            </div>
            ` : ''}

            <div class="flex-space" style="font-weight: bold;">
                <span>TOTAL AKHIR:</span>
                <span>${totalAkhirGlobal.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex-space">
                <span>TUNAI/BAYAR:</span>
                <span>${uangBayarGlobal.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex-space" style="font-weight: bold;">
                <span>KEMBALIAN:</span>
                <span>${uangKembalianGlobal.toLocaleString('id-ID')}</span>
            </div>
            <div class="divider"></div>
            <div class="text-center" style="margin-top: 8px; font-size: 11px;">
                Terima Kasih<br>Selamat Belanja Kembali
            </div>
            <script>
                window.onload = () => { setTimeout(() => { window.print(); }, 300); };
            </script>
        </body>
        </html>
    `;

    const w = window.open('', '_blank');
    w.document.write(strukHtml);
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
