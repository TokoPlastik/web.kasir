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
    const b = Number(bayarInput.value.replace(/\D/g, "")) || 0;
    const sisa = b - t;
    kembalianDisplay.innerText = sisa >= 0 ? `Kembalian: Rp${sisa.toLocaleString('id-ID')}` : `Kurang: Rp${Math.abs(sisa).toLocaleString('id-ID')}`;
    kembalianDisplay.style.background = sisa >= 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)";
    kembalianDisplay.style.color = sisa >= 0 ? "#10b981" : "#ef4444";
};

// ==== TRANSAKSI ====
window.selesaiTransaksi = async () => {
    const t = cart.reduce((s, i) => s + (i.harga * i.qty), 0);
    const bayar = Number(bayarInput.value.replace(/\D/g, "")) || 0;
    if(cart.length === 0 || bayar < t) return alert("Cek keranjang atau pembayaran!");
    
    await addDoc(collection(db, "riwayat"), { 
        total: t, 
        tanggal: new Date().toLocaleDateString('id-ID'),
        timestamp: Date.now() 
    });
    cart = []; bayarInput.value = ""; renderCart();
    alert("✅ Transaksi Berhasil!");
};

window.printStruk = () => {
    if(cart.length === 0) return alert("Keranjang kosong!");
    let s = "TOKO PLASTIK PASAR LAMA\n----------------------\n";
    cart.forEach(i => s += `${i.nama} x${i.qty} = ${i.harga * i.qty}\n`);
    s += `----------------------\nTOTAL: ${totalDisplay.innerText}`;
    const w = window.open('', '_blank');
    w.document.write(`<pre style="font-family: monospace;">${s}</pre>`);
    w.print(); w.close();
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
