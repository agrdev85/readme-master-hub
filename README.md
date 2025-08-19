# Especificaciones Técnicas para el Sistema de Torneos FPS (README.md)

## Introducción
Este documento detalla la arquitectura, modelos y flujos para el sistema de torneos FPS integrado con Unity, backend en FastAPI con Supabase (PostgreSQL), y frontend en Quasar (Vue.js). El sistema soporta:
- **Modo Gratuito**: Cualquier usuario registrado puede jugar y enviar scores a una tabla general de top 10, actualizada en tiempo real.
- **Modo Torneo Pagado**: Pago de 10 USDT TRC20 (manual inicial via admin verificación de tx_hash). Tabla separada de top 10 por torneo. Al finalizar, reparto de premios (100% del prize pool según porcentajes fijos).
- **Gestión Admin**: Verificación manual de pagos (check tx_hash en Tronscan), activación de participantes, distribución de premios, creación/eliminación de torneos.
- **Actualizaciones Realtime**: WebSockets para scores y progreso de torneos (en frontend y potencialmente Unity via polling si no soporta WS).
- **Integración Unity**: Sin alterar web.cs, Server.cs ni otros ficheros clave. Usar cufireUrl.json para mapear URLs existentes (login, register, readscore, writescore). Agregar lógica en API para diferenciar gratis/torneo basado en user status.
- **Escalabilidad Futura**: Automatización de pagos via TronGrid API (verificar tx_hash automáticamente).

El backend se basa en el main.py proporcionado, extendido para la lógica requerida. Frontend se basa en los .vue proporcionados, con ajustes para pyramid, countdown, SweetAlert y flujos.

## Arquitectura General
- **Unity (Cliente FPS)**: Usa HTTP requests via UnityWebRequest. Llama a URLs de cufireUrl.json. Para torneos, agregar check si user en torneo activo (via nueva ruta /api/user/current-tournament), y enviar score a /api/scores/submit (API decide si es gratis o torneo).
- **Backend (FastAPI + Supabase)**: API REST + WebSockets. Autenticación JWT. Lógica para torneos, pagos manuales, scores diferenciados.
- **Frontend (Quasar/Vue)**: Portal para users/admin. Muestra tablas, progreso gráfico (pyramid de monedas), countdown JS, SweetAlert para distribución. Usa axios para API.
- **Comunicación**: HTTP para auth/scores/pagos. WebSockets para realtime (scores, prize pool updates). Unity polling para realtime si necesario.

### Diagrama de Arquitectura (ASCII)
```
Unity (web.cs/Server.cs) <--> FastAPI (main.py) <--> Supabase (PostgreSQL)
                              ^
                              |
Quasar Frontend (*.vue) <--> WebSockets (Realtime)
```

## Análisis de Ficheros Existentes
- **Unity (web.cs)**: Maneja lectura/escritura de scores (url_lectura, url_escritura, url_puntaje), login (url), tabla top 10. No alterar: API debe responder en formato compatible (e.g., texto plano con "username|Puntos" separados por ';').
- **Unity (Server.cs)**: Login con form (name, password). Respuesta texto plano ("error" o success).
- **cufireUrl.json**: Mapea rutas. Actualizar a nuevas URLs, pero sin alterar Unity: backend emula formatos legacy.
- **main.py (Backend)**: Ya tiene auth, users, tournaments, payments, highscores. Extender para WebSockets, pagos manuales, distribución % específica, auto-close tournament.
- **Frontend .vue**: HomePage (lista torneos con pyramid), TournamentDetail (detalle con register, leaderboard), Register/Login/Dashboard. Agregar countdown JS, SweetAlert, disable buttons basado en is_open/is_active.

## Modelo de Base de Datos (Supabase)
Extensión del modelo en main.py. Tablas clave:

- **users**:
  - id (PK, serial)
  - name (varchar, unique)  # Compatible con Unity "name"
  - email (varchar, unique)
  - password (varchar)  # Hashed
  - wallet_usdt (varchar)  # TRC20 address, required
  - is_admin (bool, default false)
  - created_at (timestamp)

- **tournaments**:
  - id (PK, serial)
  - name (varchar)
  - max_amount (numeric)  # Objetivo USDT (e.g., 1000)
  - current_amount (numeric, default 0)
  - duration_minutes (int)  # Duración en minutos post-cierre
  - start_time (timestamp, null)  # Set cuando current >= max
  - end_time (timestamp, null)  # start + duration
  - is_open (bool, default true)  # Abierto para registros/pagos
  - is_active (bool, default false)  # Activo para scores (durante countdown)
  - admin_wallet (varchar)  # TRC20 central para pagos

- **payments**:
  - id (PK, serial)
  - user_id (FK users)
  - tournament_id (FK tournaments)
  - tx_hash (varchar)  # Hash TRC20 submitted by user
  - amount (numeric, default 10)
  - verified (bool, default false)  # Admin sets true manual
  - created_at (timestamp)

- **highscores** (Scores):
  - id (PK, serial)
  - user_id (FK users)
  - tournament_id (FK tournaments, null for gratis)
  - puntos (int)  # Score (mejor por user)
  - timestamp (timestamp)

- **prizes** (Post-distribución):
  - id (PK, serial)
  - tournament_id (FK tournaments)
  - user_id (FK users)
  - position (int)
  - amount (numeric)
  - paid (bool, default false)  # Futuro: auto-transfer

Notas:
- Scores: Solo mejor por user/tournament (update if new > old).
- Free scores: tournament_id NULL.
- Triggers Supabase: Auto-update current_amount on payment verify; set start_time/end_time when current >= max, is_open=false, is_active=true.

## Rutas API (FastAPI)
Extensión de main.py. Respuestas compatibles con Unity (texto plano para legacy routes). JWT para auth.

- **Auth** (Compatible Server.cs/web.cs):
  - POST /api/auth/login: Form {name, password} → "success" o "error:msg" (texto plano)
  - POST /api/auth/register: {name, email, password, wallet_usdt} → JWT token

- **Users**:
  - GET /api/users/me (auth): User info (incl. wallet, current_tournament_id)
  - PUT /api/users/me (auth): Update wallet

- **Tournaments**:
  - GET /api/tournaments: Lista {id, name, current_amount, max_amount, is_open, is_active, start_time, duration_minutes}
  - POST /api/tournaments (admin): {name, max_amount, duration_minutes, admin_wallet}
  - GET /api/tournaments/{id}: Detalle
  - DELETE /api/tournaments/{id} (admin): Elimina (cascade payments/scores)

- **Payments** (Para torneo):
  - POST /api/tournaments/{id}/join (auth): {tx_hash} → Crea payment pending
  - GET /api/payments/pending (admin): Lista no verified
  - PUT /api/payments/{id}/verify (admin): Verifica manual, +10 to current_amount, check if >= max → close registrations, set start_time, is_active=true
  - Futuro: Auto-verify via TronGrid (browse Tronscan for tx confirm).

- **Scores** (Compatible web.cs):
  - POST /api/scores/submit (auth): {puntos} → If user in active tournament, to tournament scores; else free. Broadcast WS.
  - GET /api/scores/global: Top 10 free (format Unity: "username|Puntos;username|Puntos;..." )
  - GET /api/scores/tournament/{id}: Top 10 torneo (mismo format)

- **Admin**:
  - POST /api/tournaments/{id}/distribute: Calcula prizes según % (30/18/13/9/5/5x5), inserta en prizes. Return JSON para SweetAlert.

- **WebSockets**:
  - WS /ws: On connect, send current scores. On score update, broadcast {type: 'update', free_top10, tournament_top10s}.

- **Unity-Specific**:
  - POST /api/scores/submit-tournament: Para scores en torneo (verifica auto).
  - GET /api/user/current-tournament: "tournament_id:X" o "0"

Ejemplo Response para Unity readscore: "user1|500;user2|400;..." (top 10).

## Flujo de Inscripción Manual a Torneo
1. User registra/login, set wallet_usdt (required).
2. Ve torneo en frontend (HomePage.vue): Si is_open, muestra admin_wallet. User transfiere 10 USDT TRC20 manual, obtiene tx_hash de Tronscan.
3. Submite tx_hash via POST /join.
4. Admin en Dashboard.vue ve pending, verifica manual (tool: browse_page Tronscan con instructions "Verify tx from [user_wallet] to [admin_wallet] amount 10 USDT hash [tx_hash]").
5. Si OK, PUT /verify → +10 current_amount. If >= max_amount, is_open=false, set start_time=now, end_time=start+duration, is_active=true.
6. Frontend: Countdown JS en HomePage/TournamentDetail (setInterval check end_time). Cuando 0, is_active=false via API poll.

## Flujo de Scores en Tiempo Real
- Unity envía score via writescore → API decide gratis/torneo basado en user current_tournament (if active).
- Update BD, broadcast WS a connected clients (frontend actualiza tablas).
- Frontend: Use Vue ref + WS onmessage para refresh leaderboards.

## Separación Tabla General vs Torneo
- General: highscores where tournament_id IS NULL, top 10 DESC puntos.
- Torneo: where tournament_id=X, top 10 DESC.

## Panel Admin (Dashboard.vue)
- Lista users, torneos.
- Verificar pagos pending.
- Crear torneo.
- Distribuir premios: POST /distribute → SweetAlert con tabla {position, icon, percentage, prize} (e.g., for 1000 USDT: 1st 300, etc.).

## Frontend Ajustes
- HomePage.vue: Badge "Cuenta atrás" con <q-countdown> o JS timer si start_time set. Si end_time pasado, "Terminado".
- TournamentDetail.vue: Botón "Unirme (10 USDT)" disabled si !is_open. Si admin y !is_active, botón "Distribuir Premio" → SweetAlert con distribución calculada en JS (o from API).
- Register/Login.vue: Require wallet_usdt en register.
- Pyramid: SVG con fill basado en current/max_amount.

## Futuro Upgrade
- Auto-verify payments: En PUT /verify, use browse_page o web_search para check Tronscan/tx_hash.
- Auto-distribute: Use Tatum API para transfer prizes to user wallets.

## Implementación
A continuación, el código completo adaptado.

# Código Backend (main.py extendido)

```python
from fastapi import FastAPI, HTTPException, Depends, Request, status, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from supabase import create_client, Client
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from typing import Optional, List
from fastapi.encoders import jsonable_encoder
from fastapi.websockets import WebSocket, WebSocketDisconnect
from typing import Dict

# Cargar variables de entorno
load_dotenv()

app = FastAPI(title="CuFire API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Para Unity y frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    wallet_usdt: str

class UserLogin(BaseModel):
    name: str
    password: str

class ScoreCreate(BaseModel):
    puntos: int

class TournamentCreate(BaseModel):
    name: str
    max_amount: float
    duration_minutes: int
    admin_wallet: str

class PaymentCreate(BaseModel):
    tx_hash: str

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        name: str = payload.get("sub")
        if name is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = supabase.table("users").select("*").eq("name", name).single().execute().data
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def verify_admin(current_user: dict):
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin required")

@app.post("/api/auth/register")
async def register(user: UserRegister):
    hashed_password = get_password_hash(user.password)
    try:
        supabase.table("users").insert({
            "name": user.name,
            "email": user.email,
            "password": hashed_password,
            "wallet_usdt": user.wallet_usdt
        }).execute()
        return {"message": "User registered"}
    except:
        raise HTTPException(status_code=400, detail="User exists")

@app.post("/api/auth/login", response_class=PlainTextResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = supabase.table("users").select("*").eq("name", form_data.username).single().execute().data
    if not user or not verify_password(form_data.password, user["password"]):
        return "error:Invalid credentials"
    access_token = create_access_token(data={"sub": user["name"]})
    return access_token  # JWT for frontend/Unity

@app.get("/api/tournaments")
async def get_tournaments(current_user: dict = Depends(get_current_user)):
    tournaments = supabase.table("tournaments").select("*").execute().data
    return tournaments

@app.post("/api/tournaments", response_model=dict)
async def create_tournament(tournament: TournamentCreate, current_user: dict = Depends(get_current_user)):
    verify_admin(current_user)
    data = supabase.table("tournaments").insert(jsonable_encoder(tournament)).execute().data[0]
    return data

@app.delete("/api/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: int, current_user: dict = Depends(get_current_user)):
    verify_admin(current_user)
    supabase.table("prizes").delete().eq("tournament_id", tournament_id).execute()
    supabase.table("payments").delete().eq("tournament_id", tournament_id).execute()
    supabase.table("highscores").delete().eq("tournament_id", tournament_id).execute()
    supabase.table("tournaments").delete().eq("id", tournament_id).execute()
    return {"message": "Deleted"}

@app.post("/api/tournaments/{tournament_id}/join")
async def join_tournament(tournament_id: int, payment: PaymentCreate, current_user: dict = Depends(get_current_user)):
    tournament = supabase.table("tournaments").select("*").eq("id", tournament_id).single().execute().data
    if not tournament or not tournament["is_open"]:
        raise HTTPException(400, "Tournament closed")
    supabase.table("payments").insert({
        "user_id": current_user["id"],
        "tournament_id": tournament_id,
        "tx_hash": payment.tx_hash,
        "verified": False
    }).execute()
    return {"message": "Payment pending verification"}

@app.put("/api/payments/{payment_id}/verify")
async def verify_payment(payment_id: int, current_user: dict = Depends(get_current_user)):
    verify_admin(current_user)
    payment = supabase.table("payments").update({"verified": True}).eq("id", payment_id).execute().data[0]
    supabase.table("tournaments").update({"current_amount": {"increment": 10}}).eq("id", payment["tournament_id"]).execute()
    tournament = supabase.table("tournaments").select("*").eq("id", payment["tournament_id"]).single().execute().data
    if tournament["current_amount"] + 10 >= tournament["max_amount"]:
        now = datetime.utcnow()
        supabase.table("tournaments").update({
            "is_open": False,
            "is_active": True,
            "start_time": now,
            "end_time": now + timedelta(minutes=tournament["duration_minutes"])
        }).eq("id", tournament["id"]).execute()
    await manager.broadcast({"type": "tournament_update", "data": tournament})
    return {"message": "Verified"}

@app.post("/api/scores/submit", response_class=PlainTextResponse)
async def submit_score(score: ScoreCreate, current_user: dict = Depends(get_current_user)):
    # Check if in active tournament
    tournament = supabase.rpc("get_user_active_tournament", {"user_id": current_user["id"]}).execute().data
    tournament_id = tournament[0]["id"] if tournament else None
    # Update or insert best score
    existing = supabase.table("highscores").select("id, puntos").eq("user_id", current_user["id"]).eq("tournament_id", tournament_id).single().execute().data
    if existing:
        if score.puntos > existing["puntos"]:
            supabase.table("highscores").update({"puntos": score.puntos, "timestamp": datetime.utcnow()}).eq("id", existing["id"]).execute()
    else:
        supabase.table("highscores").insert({
            "user_id": current_user["id"],
            "tournament_id": tournament_id,
            "puntos": score.puntos,
            "timestamp": datetime.utcnow()
        }).execute()
    # Broadcast
    await broadcast_scores()
    return "success"

async def broadcast_scores():
    free_scores = supabase.table("highscores").select("users(name), puntos").is_("tournament_id", "null").order("puntos", desc=True).limit(10).execute().data
    # Format for Unity: "name|Puntos;name|Puntos;"
    free_fmt = ";".join([f"{s['users']['name']}|{s['puntos']}" for s in free_scores])
    # Similar for tournaments, but per id
    tournaments = supabase.table("tournaments").select("id").execute().data
    tournament_scores = {}
    for t in tournaments:
        scores = supabase.table("highscores").select("users(name), puntos").eq("tournament_id", t["id"]).order("puntos", desc=True).limit(10).execute().data
        tournament_scores[t["id"]] = ";".join([f"{s['users']['name']}|{s['puntos']}" for s in scores])
    await manager.broadcast({"type": "score_update", "free": free_fmt, "tournaments": tournament_scores})

@app.get("/api/scores/global", response_class=PlainTextResponse)
async def get_global_scores():
    scores = supabase.table("highscores").select("users(name), puntos").is_("tournament_id", "null").order("puntos", desc=True).limit(10).execute().data
    return ";".join([f"{s['users']['name']}|{s['puntos']}" for s in scores]) + ";"  # Extra ; for Unity split

@app.get("/api/scores/tournament/{tournament_id}", response_class=PlainTextResponse)
async def get_tournament_scores(tournament_id: int):
    scores = supabase.table("highscores").select("users(name), puntos").eq("tournament_id", tournament_id).order("puntos", desc=True).limit(10).execute().data
    return ";".join([f"{s['users']['name']}|{s['puntos']}" for s in scores]) + ";"

@app.post("/api/tournaments/{tournament_id}/distribute")
async def distribute_prizes(tournament_id: int, current_user: dict = Depends(get_current_user)):
    verify_admin(current_user)
    tournament = supabase.table("tournaments").select("*").eq("id", tournament_id).single().execute().data
    if tournament["is_active"]:
        raise HTTPException(400, "Tournament active")
    prize_pool = tournament["current_amount"]
    percentages = [0.30, 0.18, 0.13, 0.09, 0.05] + [0.05] * 5  # 1-5 + 6-10
    scores = supabase.table("highscores").select("user_id, puntos").eq("tournament_id", tournament_id).order("puntos", desc=True).limit(10).execute().data
    prizes = []
    for i, score in enumerate(scores):
        amount = prize_pool * percentages[i]
        supabase.table("prizes").insert({
            "tournament_id": tournament_id,
            "user_id": score["user_id"],
            "position": i+1,
            "amount": amount
        }).execute()
        prizes.append({"position": i+1, "amount": amount})
    supabase.table("tournaments").update({"is_active": False}).eq("id", tournament_id).execute()  # Ensure closed
    return {"prizes": prizes}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

# Código Frontend (Ajustes a .vue)

## HomePage.vue (Ajustado con countdown, badge, pyramid)

```vue
<template>
  <q-page class="q-pa-md">
    <h1 class="text-h3 text-center text-primary">CuFire Shooter</h1>
    <q-card class="bg-dark text-white q-mb-md">
      <q-card-section>
        <h2 class="text-h5">Active Tournaments</h2>
        <q-list>
          <q-item v-for="tournament in tournaments" :key="tournament.id" clickable @click="viewTournament(tournament.id)">
            <q-item-section>
              <q-item-label class="text-h6">{{ tournament.name }}</q-item-label>
              <q-item-label caption>
                Prize Pool: {{ tournament.current_amount }} / {{ tournament.max_amount }} USDT
              </q-item-label>
              <div class="coin-pyramid">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <path :d="pyramidPath(tournament)" fill="gold" />
                  <path :d="pyramidPath(tournament, true)" fill="none" stroke="grey" stroke-width="2" />
                  <text x="50" y="50" text-anchor="middle" fill="black" font-size="12">
                    {{ progress(tournament).toFixed(0) }}%
                  </text>
                </svg>
              </div>
              <q-badge color="purple-5" v-if="tournament.start_time && !isEnded(tournament)">
                Cuenta atrás: {{ countdown(tournament) }}
              </q-badge>
              <q-badge color="red" v-else-if="isEnded(tournament)">
                Terminado
              </q-badge>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
    <q-card class="bg-dark text-white">
      <q-card-section>
        <h2 class="text-h5">Global Leaderboard</h2>
        <q-table
          :rows="globalScores"
          :columns="scoreColumns"
          row-key="user_id"
          :pagination="{ rowsPerPage: 10 }"
          dense
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { api } from 'boot/axios'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { date } from 'quasar'

export default {
  setup() {
    const router = useRouter()
    const tournaments = ref([])
    const globalScores = ref([])
    const scoreColumns = [
      { name: 'name', label: 'User', field: 'name', sortable: true },
      { name: 'puntos', label: 'Score', field: 'puntos', sortable: true }
    ]
    let interval

    const fetchData = async () => {
      const [tourRes, scoreRes] = await Promise.all([
        api.get('/api/tournaments'),
        api.get('/api/scores/global')
      ])
      tournaments.value = tourRes.data
      globalScores.value = scoreRes.data.map(s => ({name: s.split('|')[0], puntos: s.split('|')[1]}))  // Parse Unity format
    }

    const progress = (tournament) => (tournament.current_amount / tournament.max_amount) * 100

    const pyramidPath = (tournament, outline = false) => {
      const perc = outline ? 1 : progress(tournament) / 100
      const height = 80 * perc
      return `M10,90 L90,90 L50,${90 - height} Z`
    }

    const isEnded = (tournament) => {
      if (!tournament.end_time) return false
      return new Date(tournament.end_time) < new Date()
    }

    const countdown = (tournament) => {
      const diff = date.getDateDiff(new Date(tournament.end_time), new Date(), 'seconds')
      if (diff <= 0) return '00:00:00'
      const h = Math.floor(diff / 3600).toString().padStart(2, '0')
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      return `${h}:${m}:${s}`
    }

    const viewTournament = (id) => router.push(`/tournaments/${id}`)

    onMounted(() => {
      fetchData()
      interval = setInterval(fetchData, 5000)  // Poll for updates
    })

    onUnmounted(() => clearInterval(interval))

    return { tournaments, globalScores, scoreColumns, progress, pyramidPath, viewTournament, isEnded, countdown }
  }
}
</script>

<style scoped>
.coin-pyramid { text-align: center; margin: 10px 0; }
</style>
```

## TournamentDetail.vue (Ajustado con botón disable, distribute SweetAlert)

```vue
<template>
  <q-page class="q-pa-md">
    <h1 class="text-h3 text-primary">{{ tournament.name }}</h1>
    <q-card class="bg-dark text-white">
      <q-card-section>
        <div><strong>Prize Pool:</strong> {{ tournament.current_amount }} / {{ tournament.max_amount }} USDT</div>
        <div class="coin-pyramid">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <path :d="pyramidPath" fill="gold" />
            <path :d="pyramidOutline" fill="none" stroke="grey" stroke-width="2" />
            <text x="50" y="50" text-anchor="middle" fill="black" font-size="12">
              {{ progress.toFixed(0) }}%
            </text>
          </svg>
        </div>
        <q-btn v-if="tournament.is_open && !isRegistered" color="primary" label="Unirme al Torneo (10 USDT)" @click="join" />
        <q-btn v-else-if="!tournament.is_open" color="grey" label="Unirme al Torneo (10 USDT)" disable />
        <div v-if="isRegistered" class="text-positive">Registrado</div>
        <q-btn v-if="isAdmin && !tournament.is_active && tournament.end_time && new Date(tournament.end_time) < new Date()" color="positive" label="Distribuir Premio" @click="distribute" />
      </q-card-section>
    </q-card>
    <q-card class="bg-dark text-white q-mt-md">
      <q-card-section>
        <h2 class="text-h5">Tournament Leaderboard</h2>
        <q-table :rows="scores" :columns="scoreColumns" row-key="id" :pagination="{ rowsPerPage: 10 }" dense />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { api } from 'boot/axios'
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import Swal from 'sweetalert2'

export default {
  setup() {
    const $q = useQuasar()
    const route = useRoute()
    const tournament = ref({})
    const scores = ref([])
    const isRegistered = ref(false)
    const isAdmin = ref(false)
    const scoreColumns = [
      { name: 'name', label: 'User', field: 'name', sortable: true },
      { name: 'puntos', label: 'Score', field: 'puntos', sortable: true }
    ]

    const fetchData = async () => {
      const id = route.params.id
      const [tourRes, scoreRes] = await Promise.all([
        api.get(`/api/tournaments/${id}`),
        api.get(`/api/scores/tournament/${id}`)
      ])
      tournament.value = tourRes.data
      scores.value = scoreRes.data.map(s => ({name: s.split('|')[0], puntos: s.split('|')[1]}))
      // Check registered and admin (assume from user me)
      const userRes = await api.get('/api/users/me')
      isRegistered.value = !!userRes.data.current_tournament_id
      isAdmin.value = userRes.data.is_admin
    }

    const progress = () => (tournament.value.current_amount / tournament.value.max_amount) * 100

    const pyramidPath = () => `M10,90 L90,90 L50,${90 - 80 * (progress() / 100)} Z`

    const pyramidOutline = () => `M10,90 L90,90 L50,10 Z`

    const join = async () => {
      const { value: txHash } = await Swal.fire({
        title: 'Ingrese Tx Hash',
        input: 'text',
        showCancelButton: true
      })
      if (txHash) {
        await api.post(`/api/tournaments/${route.params.id}/join`, {tx_hash: txHash})
        $q.notify('Pago pendiente de verificación')
        isRegistered.value = true
      }
    }

    const distribute = async () => {
      const res = await api.post(`/api/tournaments/${route.params.id}/distribute`)
      const prizes = res.data.prizes
      const maxAmount = tournament.value.max_amount
      const tableHtml = `
        <table style="width:100%; text-align:left;">
          <tr><th>Pos</th><th>%</th><th>Premio</th></tr>
          ${prizes.map(p => {
            const perc = [30,18,13,9,5,5,5,5,5,5][p.position-1]
            return `<tr><td>🥇${p.position}</td><td>${perc}%</td><td>${(maxAmount * perc/100).toFixed(2)} USDT</td></tr>`
          }).join('')}
        </table>
      `
      Swal.fire({
        title: 'Distribución de Premios',
        html: tableHtml,
        icon: 'success'
      })
    }

    onMounted(fetchData)

    return { tournament, scores, isRegistered, isAdmin, scoreColumns, progress, pyramidPath, pyramidOutline, join, distribute }
  }
}
</script>

<style scoped>
.coin-pyramid { text-align: center; margin: 10px 0; }
</style>
```

## RegisterPage.vue (Ajustado con wallet required)

```vue
<template>
  <q-page class="q-pa-md">
    <q-card class="q-mx-auto bg-dark text-white" style="max-width: 400px;">
      <q-card-section>
        <h2 class="text-h5">Register</h2>
        <q-form @submit="register">
          <q-input v-model="form.name" label="Name" required filled />
          <q-input v-model="form.email" label="Email" type="email" required filled />
          <q-input v-model="form.password" label="Password" type="password" required filled />
          <q-input v-model="form.wallet_usdt" label="USDT Wallet (TRC20)" required filled />
          <q-btn type="submit" color="primary" label="Register" class="q-mt-md" />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { api } from 'boot/axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default {
  setup() {
    const router = useRouter()
    const form = ref({ name: '', email: '', password: '', wallet_usdt: '' })

    const register = async () => {
      await api.post('/api/auth/register', form.value)
      router.push('/login')
    }

    return { form, register }
  }
}
</script>
```

## DashboardPage.vue (Ajustado con admin features)

```vue
<template>
  <q-page class="q-pa-md">
    <h1 class="text-h3 text-primary">Dashboard</h1>
    <div v-if="isAdmin">
      <h2 class="text-h5">Manage Users</h2>
      <q-table :rows="users" :columns="userColumns" row-key="id" dense class="bg-dark text-white" />
      <h2 class="text-h5 q-mt-md">Manage Tournaments</h2>
      <q-form @submit="createTournament">
        <q-input v-model="tournamentForm.name" label="Name" required filled />
        <q-input v-model.number="tournamentForm.max_amount" label="Max Amount (USDT)" type="number" required filled />
        <q-input v-model.number="tournamentForm.duration_minutes" label="Duration (minutes)" type="number" required filled />
        <q-input v-model="tournamentForm.admin_wallet" label="Admin Wallet (TRC20)" required filled />
        <q-btn type="submit" color="primary" label="Create Tournament" class="q-mt-md" />
      </q-form>
      <q-table :rows="tournaments" :columns="tournamentColumns" row-key="id" dense class="bg-dark text-white q-mt-md">
        <template v-slot:body="props">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">{{ col.value }}</q-td>
            <q-td>
              <q-btn color="negative" label="Delete" @click="deleteTournament(props.row.id)" />
            </q-td>
          </q-tr>
        </template>
      </q-table>
      <h2 class="text-h5 q-mt-md">Pending Payments</h2>
      <q-table :rows="pendingPayments" :columns="paymentColumns" row-key="id" dense class="bg-dark text-white">
        <template v-slot:body="props">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">{{ col.value }}</q-td>
            <q-td>
              <q-btn color="positive" label="Verify" @click="verifyPayment(props.row.id)" />
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
    <div v-else>
      <h2 class="text-h5">Your Information</h2>
      <q-card class="bg-dark text-white">
        <q-card-section>
          <div><strong>Name:</strong> {{ userInfo.name }}</div>
          <div><strong>Email:</strong> {{ userInfo.email }}</div>
          <div><strong>Wallet:</strong> {{ userInfo.wallet_usdt }}</div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { api } from 'boot/axios'
import { ref, onMounted } from 'vue'

export default {
  setup() {
    const users = ref([])
    const tournaments = ref([])
    const pendingPayments = ref([])
    const userInfo = ref({})
    const isAdmin = ref(false)
    const tournamentForm = ref({ name: '', max_amount: 0, duration_minutes: 0, admin_wallet: '' })
    const userColumns = [
      { name: 'id', label: 'ID', field: 'id' },
      { name: 'name', label: 'Name', field: 'name' },
      { name: 'email', label: 'Email', field: 'email' },
      { name: 'wallet_usdt', label: 'Wallet', field: 'wallet_usdt' }
    ]
    const tournamentColumns = [
      { name: 'id', label: 'ID', field: 'id' },
      { name: 'name', label: 'Name', field: 'name' },
      { name: 'current_amount', label: 'Current USDT', field: 'current_amount' },
      { name: 'max_amount', label: 'Max USDT', field: 'max_amount' }
    ]
    const paymentColumns = [
      { name: 'id', label: 'ID', field: 'id' },
      { name: 'user_id', label: 'User ID', field: 'user_id' },
      { name: 'tournament_id', label: 'Tournament', field: 'tournament_id' },
      { name: 'tx_hash', label: 'Tx Hash', field: 'tx_hash' }
    ]

    const fetchData = async () => {
      const userRes = await api.get('/api/users/me')
      userInfo.value = userRes.data
      isAdmin.value = userRes.data.is_admin
      if (isAdmin.value) {
        const [usersRes, tourRes, payRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/api/tournaments'),
          api.get('/api/payments/pending')
        ])
        users.value = usersRes.data
        tournaments.value = tourRes.data
        pendingPayments.value = payRes.data
      }
    }

    const createTournament = async () => {
      await api.post('/api/tournaments', tournamentForm.value)
      fetchData()
    }

    const deleteTournament = async (id) => {
      await api.delete(`/api/tournaments/${id}`)
      fetchData()
    }

    const verifyPayment = async (id) => {
      await api.put(`/api/payments/${id}/verify`)
      fetchData()
    }

    onMounted(fetchData)

    return { users, tournaments, pendingPayments, userInfo, isAdmin, tournamentForm, userColumns, tournamentColumns, paymentColumns, createTournament, deleteTournament, verifyPayment }
  }
}
</script>
```

## LoginPage.vue (Sin cambios mayores, usa name/password)

```vue
<template>
  <q-page class="q-pa-md">
    <q-card class="q-mx-auto bg-dark text-white" style="max-width: 400px;">
      <q-card-section>
        <h2 class="text-h5">Login</h2>
        <q-form @submit="login">
          <q-input v-model="form.name" label="Name" required filled />
          <q-input v-model="form.password" label="Password" type="password" required filled />
          <q-btn type="submit" color="primary" label="Login" class="q-mt-md" />
          <q-alert v-if="errorMessage" color="negative" class="q-mt-md">{{ errorMessage }}</q-alert>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { api } from 'boot/axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default {
  setup() {
    const router = useRouter()
    const form = ref({ name: '', password: '' })
    const errorMessage = ref('')

    const login = async () => {
      try {
        const res = await api.post('/api/auth/login', null, { params: { username: form.value.name, password: form.value.password } })  // Form data
        localStorage.setItem('token', res.data)
        router.push('/dashboard')
      } catch (error) {
        errorMessage.value = 'Invalid credentials'
      }
    }

    return { form, login, errorMessage }
  }
}
</script>
```

# Integración con Unity
- Actualiza cufireUrl.json a:
```json
{
  "login": "http://your-domain/api/auth/login",
  "register": "http://your-domain/api/auth/register",
  "readscore": "http://your-domain/api/scores/global",
  "writescore": "http://your-domain/api/scores/submit"
}
```
- El README.md es el documento maestro con las especificaciones.
- Generar backend, frontend, integrar con Unity(sin alterar cs, los archivos de Unity web.cs, Server.cs no deben modificarse); el backend y frontend deben adaptarse a ellos, configurar Supabase
- ficheros de apoyo (para contexto):
web.cs, Server.cs, cufireUrl.json (Unity).
main.py (backend).
HomePage.vue, TournamentDetail.vue, RegisterPage.vue, DashboardPage.vue, LoginPage.vue (frontend).
- El backend debe extender main.py con FastAPI y Supabase.
El frontend debe usar Quasar y ajustar los .vue para countdown, SweetAlert, etc.