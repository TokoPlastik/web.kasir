import { db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from './firebase.js';

// ==== DOM ELEMENTS ====
const username = document.getElementById("username");
const password = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const loginPage = document.getElementById("loginPage");
const appDiv = document.getElementById("app");

const menuList = document.getElementById("menuList");
const cartList = document.getElementById("cartList");
const riwayatDiv = document.getElementById("riwayat");

const nama = document.getElementById("nama");
const harga = document.getElementById("harga");
const bayarInput = document.getElementById("bayar");
const totalDisplay = document.getElementById("total");
const totalHarianDisplay = document.getElementById("totalHarian");
const kembalianDisplay = document.getElementById("kembalian");

// ==== LOGIN ====
const user = { username: "admin", password: "123" };

btnLogin.addEventListener("click", login);
password.addEventListener("keypress", function(e){
  if(e.key === "Enter") btnLogin.click();
});

function login() {
  if(username.value === user.username && password.value === user.password){
    loginPage.style.display = "none";
    appDiv.style.display = "block";
    initRealtime(); // <-- pastikan ini dipanggil
  } else alert("Salah");
}

// ==== UTILITY ====
function formatRupiah(input){
  let v = input.value.replace(/\D/g,"");
  input.value = v.replace(/\B(?=(\d{3})+(?!\d))/g,".");
}
function parseRupiah(v){
  return Number((v||"").replace(/\./g,""));
}
function getTanggal(){
  let d = new Date();
  return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
}
function getBulan(){
  let d = new Date();
  return d.getFullYear()+"-"+(d.getMonth()+1);
}

// ==== STATE ====
let barang = [];
let cart = [];
let riwayat = [];

// ==== FIREBASE REFERENCES ====
const barangRef = collection(db, "barang");
const riwayatRef = collection(db, "riwayat");

// ==== REALTIME SYNC ====
function initRealtime(){
  // Barang realtime
  onSnapshot(barangRef, (snapshot)=>{
    barang = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMenu();
  });

  // Riwayat realtime
  onSnapshot(riwayatRef, (snapshot)=>{
    riwayat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRiwayat();
  });
}

// ==== MENU ====
function renderMenu(){
  menuList.innerHTML="";
  const keyword = document.getElementById("search").value.toLowerCase();
  barang
    .filter(b => b.nama.toLowerCase().includes(keyword))
    .forEach((b,i)=>{
      const d = document.createElement("div");
      d.className = "card";
      d.innerHTML = `
        ${b.nama}<br>Rp${b.harga.toLocaleString()}<br>
        <button class='btn-add' onclick="tambahKeCart('${b.id}')">Tambah</button>
        <button class='btn-edit' onclick="editBarang('${b.id}')">Edit</button>
        <button class='btn-delete' onclick="hapusBarang('${b.id}')">Hapus</button>
      `;
      menuList.appendChild(d);
    });
}

// ==== CRUD BARANG ====
async function tambahBarang(){
  const n = nama.value;
  const h = parseRupiah(harga.value);
  if(!n||!h) return;

  await addDoc(barangRef, { nama: n, harga: h });
  nama.value=""; harga.value="";
}

async function editBarang(id){
  const b = barang.find(x=>x.id===id);
  const h = prompt("Harga baru", b.harga);
  if(h){
    const bDoc = doc(db, "barang", id);
    await updateDoc(bDoc, { harga: Number(h) });
  }
}

async function hapusBarang(id){
  const bDoc = doc(db, "barang", id);
  await deleteDoc(bDoc);
}

// ==== CART ====
function tambahKeCart(id){
  const b = barang.find(x=>x.id===id);
  const it = cart.find(x=>x.id===id);
  if(it) it.qty++;
  else cart.push({ id: b.id, nama: b.nama, harga: b.harga, qty: 1 });
  renderCart();
}

function renderCart(){
  cartList.innerHTML="";
  let total=0;
  cart.forEach((c,i)=>{
    const sub = c.harga*c.qty;
    total += sub;

    const d = document.createElement("div");
    d.className="cart-item";
    d.innerHTML=`
      <div>${c.nama}<br>Rp${c.harga.toLocaleString()}</div>
      <div>
        <button onclick="kurangQty(${i})">-</button>
        ${c.qty}
        <button onclick="tambahQty(${i})">+</button>
        <button class='btn-delete' onclick="hapusItem(${i})">x</button>
      </div>
    `;
    cartList.appendChild(d);
  });
  totalDisplay.innerText = "Total: Rp" + total.toLocaleString();
}

function tambahQty(i){ cart[i].qty++; renderCart(); }
function kurangQty(i){ if(cart[i].qty>1) cart[i].qty--; else cart.splice(i,1); renderCart(); }
function hapusItem(i){ cart.splice(i,1); renderCart(); }

function hitungKembalian(){
  const bayar = parseRupiah(bayarInput.value);
  const total = cart.reduce((a,b)=>a+(b.harga*b.qty),0);
  const k = bayar-total;
  kembalianDisplay.innerText = k>=0 ? "Kembalian: Rp"+k.toLocaleString() : "Kurang";
}

async function selesaiTransaksi(){
  if(cart.length===0) return;
  const total = cart.reduce((a,b)=>a+(b.harga*b.qty),0);
  const data = {
    tgl: new Date().toLocaleString(),
    tanggal: getTanggal(),
    bulan: getBulan(),
    total
  };
  await addDoc(riwayatRef, data);
  cart=[]; bayarInput.value=""; kembalianDisplay.innerText="";
  renderCart();
}

// ==== RIWAYAT ====
function renderRiwayat(){
  riwayatDiv.innerHTML="";
  const today = getTanggal();
  const thisMonth = getBulan();

  let totalHari=0;
  let totalBulan=0;

  // total bulan
  riwayat.forEach(r=>{
    if(r.bulan===thisMonth) totalBulan+=r.total;
  });

  let bulanDiv = document.createElement("div");
  bulanDiv.className="card";
  bulanDiv.innerHTML="Bulan ini: Rp"+totalBulan.toLocaleString();
  riwayatDiv.appendChild(bulanDiv);

  // hari ini
  let titleToday = document.createElement("h4"); titleToday.innerText="Hari Ini";
  riwayatDiv.appendChild(titleToday);

  riwayat.filter(r=>r.tanggal===today).reverse().forEach(r=>{
    totalHari+=r.total;
    const d = document.createElement("div");
    d.className="card";
    d.innerHTML = `${r.tgl}<br>Rp${r.total.toLocaleString()}`;
    riwayatDiv.appendChild(d);
  });

  // sebelumnya
  let titleOld = document.createElement("h4"); titleOld.innerText="Sebelumnya";
  riwayatDiv.appendChild(titleOld);

  riwayat.filter(r=>r.tanggal!==today).reverse().forEach(r=>{
    const d = document.createElement("div");
    d.className="card";
    d.innerHTML = `${r.tgl}<br>Rp${r.total.toLocaleString()}`;
    riwayatDiv.appendChild(d);
  });

  totalHarianDisplay.innerText = "Rp"+totalHari.toLocaleString();
}

// ==== PRINT ====
function printStruk(){
  let text = "TOKO AMANAH FUTURISTIC\n";
  let total=0;
  cart.forEach(c=>{
    const sub = c.harga*c.qty;
    total += sub;
    text += `${c.nama} x${c.qty} Rp${sub.toLocaleString()}\n`;
  });
  text += "Total: Rp"+total.toLocaleString();
  const w = window.open();
  w.document.write("<pre>"+text+"</pre>");
  w.print();
}

// ==== MAKE FUNCTIONS GLOBAL FOR HTML INLINE BUTTONS ====
window.tambahBarang = tambahBarang;
window.tambahKeCart = tambahKeCart;
window.editBarang = editBarang;
window.hapusBarang = hapusBarang;
window.tambahQty = tambahQty;
window.kurangQty = kurangQty;
window.hapusItem = hapusItem;
window.hitungKembalian = hitungKembalian;
window.selesaiTransaksi = selesaiTransaksi;
window.printStruk = printStruk;
