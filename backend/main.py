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
from typing import Optional
import requests
from typing import List
from fastapi.encoders import jsonable_encoder

# Cargar variables de entorno
load_dotenv()

# Configuración de la aplicación
app = FastAPI(
    title="Game API",
    description="API para el juego DUFIRE",
    version="1.0.0",
    swagger_ui_parameters={
        "tryItOutEnabled": True,
        "persistAuthorization": True
    }
)


# Configura CORS para permitir todas las conexiones desde Unity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9000"],  # Lista exacta de orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Configuración de Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
TATUM_API_KEY = os.getenv("TATUM_API_KEY")
WALLET_CENTRAL = os.getenv("WALLET_CENTRAL")

# Inicialización del cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configuración de seguridad
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="api/auth/login",
    auto_error=False  # Permite endpoints públicos
)

# Modelos Pydantic
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    wallet_usdt: str
    is_admin: Optional[bool] = False

# Modelo modificado para aceptar "name" en lugar de "username"
class UserLogin(BaseModel):
    name: str
    password: str

# Modelo modificado para aceptar "name" y "puntos" (como en Unity)
class ScoreCreate(BaseModel):
    name: str  # Nuevo campo para compatibilidad con Unity
    puntos: int  # Se mantiene igual
    tournament_id: Optional[int] = None  # Opcional

class TournamentJoin(BaseModel):
    tx_hash: str

class TournamentCreate(BaseModel):
    name: str
    max_users: int = 100
    entry_fee: float = 10.00
    start_date: datetime
    end_date: datetime
    
class TournamentJoinManual(BaseModel):
    wallet_usdt: str  # Dirección TRC20 del usuario
    tx_hash: str  # Opcional para verificación posterior

# Modelos adicionales
class TournamentStatusUpdate(BaseModel):
    status: str  # "open", "closed", "completed"

class TournamentDistributePrizes(BaseModel):
    tournament_id: int

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    wallet_usdt: Optional[str] = None
    is_admin: Optional[bool] = None

# Funciones de utilidad
def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = supabase.table("users").select("*").eq("name", username).execute().data
    if not user:
        raise credentials_exception
    return user[0]

# Función para verificar admin
def verify_admin(current_user: dict):
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

# Nuevas funciones de utilidad
def calculate_prize_distribution(prize_pool: float) -> List[dict]:
    distribution = [
        {"position": 1, "percentage": 0.35, "prize": prize_pool * 0.35, "icon": "🥇"},
        {"position": 2, "percentage": 0.20, "prize": prize_pool * 0.20, "icon": "🥈"},
        {"position": 3, "percentage": 0.15, "prize": prize_pool * 0.15, "icon": "🥉"},
        {"position": 4, "percentage": 0.10, "prize": prize_pool * 0.10, "icon": "🥉"},
        {"position": 5, "percentage": 0.07, "prize": prize_pool * 0.07, "icon": "🥉"},
    ]
    # Posiciones 6-10 (2% cada una)
    for i in range(6, 11):
        distribution.append({
            "position": i,
            "percentage": 0.02,
            "prize": prize_pool * 0.02,
            "icon": "🏅"
        })
    return distribution

async def check_tournament_status(tournament_id: int):
    tournament = supabase.table("tournaments").select("*").eq("id", tournament_id).execute().data
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament[0]

# verify_tournament user
async def verify_tournament_user(
    tournament_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Dependencia que verifica si el usuario está registrado en el torneo especificado
    """
    registration = supabase.table("payments")\
                  .select("*")\
                  .eq("user_id", current_user["id"])\
                  .eq("tournament_id", tournament_id)\
                  .execute().data
                  
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not registered in this tournament"
        )
        
    return registration[0]

# Endpoints de usuarios
@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user
        
# Endpoints para Unity (compatibles con Server.cs y web.cs)
@app.post("/api/auth/login")
async def unity_login(name: str = Form(...), password: str = Form(...)):
    user = supabase.table("users").select("*").eq("name", name).execute().data
    if not user or not verify_password(password, user[0]["password"]):
        return "error:Invalid credentials"
    
    # Formato compatible con Unity: "key1:value1|key2:value2"
    return f"user_id:{user[0]['id']}|name:{user[0]['name']}|token:{create_access_token({'sub': user[0]['name']})}"

@app.post("/api/auth/register")
async def unity_register(request: Request):
    form_data = await request.form()
    name = form_data.get("name")
    email = form_data.get("email")
    password = form_data.get("password")
    
    # Verificar usuario existente
    existing_user = supabase.table("users").select("*").eq("name", name).execute().data
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Crear usuario
    try:
        user_data = {
            "name": name,
            "email": email,
            "password": get_password_hash(password),
            "wallet_usdt": "",
            "is_admin": False,
            "aprobado": True,
            "paquete": "free"
        }
        
        new_user = supabase.table("users").insert(user_data).execute().data[0]
        return {
            "message": "User registered successfully",
            "user_id": new_user["id"],
            "access_token": create_access_token({"sub": new_user["name"]}),
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scores/submit")
async def submit_score(
    request: Request,
    name: str = Form(default=None),
    puntos: int = Form(default=None),
    tournament_id: int = Form(default=0),
    token: str = Form(default=None)
):
    try:
        # Verificar autenticación si se requiere token
        if token:
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            except JWTError:
                return PlainTextResponse("error:Invalid token", status_code=401)

        # Obtener datos del form-data
        form_data = await request.form()
        name = name or form_data.get("name")
        puntos = puntos or int(form_data.get("puntos", 0))
        
        if not name or puntos <= 0:
            return PlainTextResponse("error:Missing name or invalid score", status_code=400)

        # Insertar en Supabase
        score_data = {
            "name": name,
            "puntos": puntos
        }
        
        if tournament_id and tournament_id > 0:
            score_data["tournament_id"] = tournament_id
            
        supabase.table("highscores").insert(score_data).execute()
        
        return PlainTextResponse("success")

    except Exception as e:
        return PlainTextResponse(f"error:{str(e)}", status_code=500)

@app.get("/api/scores/global")
async def get_global_scores():
    try:
        scores = supabase.table("highscores")\
                   .select("name, puntos")\
                   .order("puntos", desc=True)\
                   .limit(10)\
                   .execute()
        
        # Convertir a string sin comillas adicionales
        scores_str = ";".join([f"username{item['name']}|Puntos{item['puntos']}" for item in scores.data])
        return PlainTextResponse(scores_str)  # ← ¡Clave aquí!
        
    except Exception as e:
        return PlainTextResponse(f"error:{str(e)}")

# Endpoints de torneos
@app.post("/tournaments")
async def create_tournament(tournament: TournamentCreate, current_user: dict = Depends(get_current_user)):
    try:
        tournament_data = {
            "name": tournament.name,
            "max_users": tournament.max_users,
            "entry_fee": tournament.entry_fee,
            "start_date": str(tournament.start_date),
            "end_date": str(tournament.end_date),
            "status": "open",
            "current_users": 0,
            "prize_pool": 0.00
        }
        
        response = supabase.table("tournaments").insert(tournament_data).execute()
        return {
            "message": "Tournament created successfully",
            "tournament_id": response.data[0]["id"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tournament: {str(e)}"
        )

@app.post("/tournaments/{tournament_id}/join")
async def join_tournament(tournament_id: int, data: TournamentJoin, current_user: dict = Depends(get_current_user)):
    try:
        # Verificar el torneo
        tournament = supabase.table("tournaments").select("*").eq("id", tournament_id).execute().data
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        tournament = tournament[0]
        
        # Verificar si ya está registrado
        existing_reg = supabase.table("payments").select("*").eq("user_id", current_user["id"]).eq("tournament_id", tournament_id).execute().data
        if existing_reg:
            raise HTTPException(status_code=400, detail="Already registered in this tournament")
        
        # Verificar transacción con Tatum
        tx_response = requests.get(
            f"https://api.tatum.io/v3/tron/transaction/{data.tx_hash}",
            headers={"x-api-key": TATUM_API_KEY}
        )
        tx_details = tx_response.json()
        
        if not tx_details or float(tx_details.get("amount", 0)) < tournament["entry_fee"] or tx_details.get("to") != WALLET_CENTRAL:
            raise HTTPException(status_code=400, detail="Invalid transaction")
        
        # Registrar pago
        payment_data = {
            "user_id": current_user["id"],
            "tournament_id": tournament_id,
            "tx_hash": data.tx_hash,
            "amount": tournament["entry_fee"],
            "status": "confirmed"
        }
        supabase.table("payments").insert(payment_data).execute()
        
        # Actualizar torneo
        supabase.table("tournaments").update({
            "current_users": tournament["current_users"] + 1,
            "prize_pool": tournament["prize_pool"] + tournament["entry_fee"]
        }).eq("id", tournament_id).execute()
        
        # Actualizar usuario
        supabase.table("users").update({
            "paquete": "tournament"
        }).eq("id", current_user["id"]).execute()
        
        return {"message": "Successfully joined tournament"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error joining tournament: {str(e)}"
        )

@app.get("/tournaments")
async def get_tournaments(status: Optional[str] = None):
    try:
        query = supabase.table("tournaments").select("*")
        if status:
            query = query.eq("status", status)
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tournaments: {str(e)}"
        )
        
@app.post("/tournaments/{tournament_id}/join_manual")
async def join_tournament_manual(
    tournament_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint para unirse a torneos con verificación manual de pago.
    Usa la wallet_usdt de la tabla users mediante la relación user_id.
    """
    try:
        # 1. Verificar que el torneo existe y está abierto
        tournament = supabase.table("tournaments").select("*").eq("id", tournament_id).execute().data
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        tournament = tournament[0]

        if tournament["status"] != "open":
            raise HTTPException(status_code=400, detail="Tournament is not open for registration")

        # 2. Verificar si el usuario ya está registrado
        existing_reg = supabase.table("payments").select("*").eq("user_id", current_user["id"]).eq("tournament_id", tournament_id).execute().data
        if existing_reg:
            raise HTTPException(status_code=400, detail="Already registered in this tournament")

        # 3. Obtener la wallet del usuario desde la tabla users
        user_wallet = current_user["wallet_usdt"]  # Obtenido automáticamente del JWT

        # 4. Registrar la solicitud de pago (sin duplicar wallet_usdt)
        payment_data = {
            "user_id": current_user["id"],
            "tournament_id": tournament_id,
            "amount": 10.00,  # 10 USDT
            "status": "pending",
            "tx_hash": "manual_verification_required"
        }

        supabase.table("payments").insert(payment_data).execute()

        return {
            "message": "Registration request received. Admin will manually verify your payment.",
            "payment_instructions": {
                "amount": 10.00,
                "wallet_central": WALLET_CENTRAL,
                "your_wallet": user_wallet,
                "next_steps": "Send 10 USDT (TRC20) to the central wallet and notify admin"
            },
            "relations": {
                "user_id": current_user["id"],
                "tournament_id": tournament_id,
                "user_wallet": user_wallet
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error joining tournament: {str(e)}"
        )

# Endpoint para ADMIN (verificar pagos manualmente)
@app.post("/admin/verify_payment/{payment_id}")
async def verify_payment_manual(
    payment_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint corregido para verificación manual de pagos
    """
    try:
        # 1. Verificar permisos de admin
        if not current_user.get("is_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )

        # 2. Obtener el pago con datos relacionados
        payment = supabase.from_("payments")\
                   .select("*, users!inner(*), tournaments!inner(*)")\
                   .eq("id", payment_id)\
                   .execute().data
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        payment = payment[0]
        tournament_id = payment["tournament_id"]
        user_id = payment["user_id"]
        amount = payment["amount"]

        # 3. Actualizar el estado del pago
        supabase.table("payments")\
               .update({"status": "confirmed"})\
               .eq("id", payment_id)\
               .execute()

        # 4. Actualizar el torneo (sin usar RPC)
        tournament = supabase.table("tournaments")\
                        .select("*")\
                        .eq("id", tournament_id)\
                        .execute().data[0]
        
        supabase.table("tournaments")\
               .update({
                   "current_users": tournament["current_users"] + 1,
                   "prize_pool": tournament["prize_pool"] + amount
               })\
               .eq("id", tournament_id)\
               .execute()

        # 5. Actualizar usuario
        supabase.table("users")\
               .update({"paquete": "tournament"})\
               .eq("id", user_id)\
               .execute()

        return {
            "message": "Payment verified successfully",
            "details": {
                "user_id": user_id,
                "tournament_id": tournament_id,
                "amount": amount,
                "new_prize_pool": tournament["prize_pool"] + amount,
                "new_participants": tournament["current_users"] + 1
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification error: {str(e)}"
        )

# Añadir después de los endpoints existentes
@app.post("/tournaments/{tournament_id}/close")
async def close_tournament(
    tournament_id: int,
    current_user: dict = Depends(get_current_user)
):
    verify_admin(current_user)
    
    tournament = await check_tournament_status(tournament_id)
    
    if tournament["status"] != "open":
        raise HTTPException(status_code=400, detail="Tournament is not open")
    
    supabase.table("tournaments").update({
        "status": "closed",
        "end_date": datetime.utcnow().isoformat()
    }).eq("id", tournament_id).execute()
    
    return {"message": "Tournament closed successfully"}

@app.post("/tournaments/{tournament_id}/distribute_prizes")
async def distribute_prizes(
    tournament_id: int,
    current_user: dict = Depends(get_current_user)
):
    verify_admin(current_user)
    
    tournament = await check_tournament_status(tournament_id)
    
    if tournament["status"] != "closed":
        raise HTTPException(status_code=400, detail="Tournament must be closed first")
    
    # Obtener los 10 mejores scores del torneo
    top_scores = supabase.table("highscores")\
                .select("name, puntos, user_id")\
                .eq("tournament_id", tournament_id)\
                .order("puntos", desc=True)\
                .limit(10)\
                .execute().data
    
    if not top_scores:
        raise HTTPException(status_code=400, detail="No scores available for this tournament")
    
    # Calcular distribución de premios
    prize_distribution = calculate_prize_distribution(tournament["prize_pool"])
    
    # Registrar premios
    prize_records = []
    for i, score in enumerate(top_scores):
        if i < len(prize_distribution):
            prize_info = prize_distribution[i]
            prize_records.append({
                "tournament_id": tournament_id,
                "user_id": score["user_id"],
                "position": prize_info["position"],
                "prize_amount": prize_info["prize"],
                "status": "pending"
            })
    
    # Insertar registros de premios
    supabase.table("prizes").insert(prize_records).execute()
    
    # Actualizar estado del torneo
    supabase.table("tournaments").update({
        "status": "completed",
        "distributed": True
    }).eq("id", tournament_id).execute()
    
    return {
        "message": "Prizes distributed successfully",
        "prize_distribution": prize_distribution,
        "top_scores": top_scores
    }

@app.delete("/tournaments/{tournament_id}")
async def delete_tournament(
    tournament_id: int,
    current_user: dict = Depends(get_current_user)
):
    verify_admin(current_user)
    
    # Eliminar en cascada (Supabase debe tener las relaciones configuradas)
    try:
        # 1. Eliminar premios asociados
        supabase.table("prizes").delete().eq("tournament_id", tournament_id).execute()
        
        # 2. Eliminar pagos asociados
        supabase.table("payments").delete().eq("tournament_id", tournament_id).execute()
        
        # 3. Eliminar scores asociados
        supabase.table("highscores").delete().eq("tournament_id", tournament_id).execute()
        
        # 4. Finalmente eliminar el torneo
        supabase.table("tournaments").delete().eq("id", tournament_id).execute()
        
        return {"message": "Tournament and all related data deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting tournament: {str(e)}"
        )

@app.get("/admin/users", response_model=List[dict])
async def get_all_users(
    current_user: dict = Depends(get_current_user)
):
    verify_admin(current_user)
    users = supabase.table("users").select("*").execute().data
    return users

@app.put("/admin/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    verify_admin(current_user)
    
    update_data = user_data.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])
    
    updated_user = supabase.table("users").update(update_data).eq("id", user_id).execute().data
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return updated_user[0]

@app.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    verify_admin(current_user)
    
    # Verificar si el usuario existe
    user = supabase.table("users").select("*").eq("id", user_id).execute().data
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Eliminar usuario
    supabase.table("users").delete().eq("id", user_id).execute()
    
    return {"message": "User deleted successfully"}

# Añadir estos endpoints al archivo main.py

@app.get("/users/current-tournament")
async def get_current_tournament(current_user: dict = Depends(get_current_user)):
    """
    Obtiene el torneo activo actual del usuario (solo 1 por usuario)
    """
    try:
        # Buscar el último torneo activo donde el usuario está registrado
        response = supabase.rpc('get_user_active_tournament', {
            'user_id': current_user['id']
        }).execute()
        
        if response.data:
            return response.data[0]
        return None
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving current tournament: {str(e)}"
        )

@app.post("/scores/submit-tournament")
async def submit_tournament_score(
    score: ScoreCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint especial para enviar puntuaciones de torneo
    que verifica automáticamente el torneo actual del usuario
    """
    try:
        # 1. Obtener el torneo actual del usuario
        tournament = supabase.rpc('get_user_active_tournament', {
            'user_id': current_user['id']
        }).execute()
        
        if not tournament.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not registered in any active tournament"
            )
            
        tournament = tournament.data[0]
        
        # 2. Verificar que el torneo esté en fase de juego (status = 'closed')
        if tournament['status'] != 'closed':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tournament is not in playing phase"
            )
            
        # 3. Insertar el score con el tournament_id automáticamente
        score_data = {
            "user_id": current_user['id'],
            "name": current_user['name'],
            "puntos": score.puntos,
            "tournament_id": tournament['id']
        }
        
        supabase.table("highscores").insert(score_data).execute()
        
        return {"message": "Tournament score submitted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting tournament score: {str(e)}"
        )
        
@app.get("/api/user/current-tournament")
async def unity_get_current_tournament(token: str = Form(...)):
    """
    Endpoint especial para Unity que devuelve el ID del torneo actual del usuario
    en formato compatible con Unity (string plano)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        
        if not username:
            return "error:Invalid token"
            
        # Obtener usuario
        user = supabase.table("users").select("*").eq("name", username).execute().data
        if not user:
            return "error:User not found"
            
        user = user[0]
        
        # Obtener torneo activo
        tournament = supabase.rpc('get_user_active_tournament', {
            'user_id': user['id']
        }).execute()
        
        if tournament.data:
            return f"tournament_id:{tournament.data[0]['id']}"
        return "tournament_id:0"  # 0 significa que no está en ningún torneo
        
    except JWTError:
        return "error:Invalid token"
    except Exception as e:
        return f"error:{str(e)}"
    
            
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)