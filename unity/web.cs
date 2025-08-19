using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using UnityEngine.Networking;

public class web : MonoBehaviour
{
    
    [System.Serializable]
    public struct estructuraDatosWeb
    {
        [System.Serializable]
        public struct registro
        {
            public string nombre;
            public int puntaje;
        }
        public List<registro> registros;
        //public registro[] registros;
        
    }

    public estructuraDatosWeb datos;


    public Transform tabla;
    public Transform nuevo;
    public GameObject plantillaRegistros;
    public GameObject score;
    public GameObject game;
    public GameObject salir;
    private AudioSource sonido;
    //public SingletonPtos singletonptos;
    public int cantidadRegistro = 10;
    public int miPuntaje;
    private bool active = false;
    public TMPro.TMP_InputField miNombre;
    [SerializeField] TMPro.TextMeshProUGUI userActivo;
    [SerializeField] GameObject myCamera;
    private string nameActivo;
    bool gameOver;
    bool corresponde;
    public bool noUser = false;
    public string[] userData;
    public string[] userPuntajeBD;
    public int[] scoreArray;

    
    [SerializeField] string url_lectura;
    [SerializeField] string url_escritura;
    [SerializeField] string  url_puntaje;
    [SerializeField] string url;
    [SerializeField] Text errorMessages;
    
    
    //Variables Sin Json
    /*public string name;
    public int ptos; */
    

    //----------------------------------------- Método con Base de Datos

    [ContextMenu("Leer Puntaje")]
    public void LeerPuntaje()
    
    {

       StartCoroutine(CorrutinaLeerPuntaje());
      
    }

    private IEnumerator CorrutinaLeerPuntaje()
    {
        UnityWebRequest web = UnityWebRequest.Get(url_puntaje);
        
        yield return web.SendWebRequest();
        //Esperamos a que vuelva

        if (!web.isNetworkError && !web.isHttpError)
        {
            //Todo Ok
            Debug.Log(web.downloadHandler.text);
           
            string userDataPuntaje = web.downloadHandler.text;
            userPuntajeBD = userDataPuntaje.Split(';');
            Debug.Log(userPuntajeBD);

          
           
        }
        else
        {
            Debug.LogWarning("Error al leer del servidor");
            
        }
    }



    [ContextMenu("Leer")]
    public void Leer(System.Action accionTerminar)
    
    {
       StartCoroutine(CorrutinaLeer(accionTerminar));
       
      
    }

    private IEnumerator CorrutinaLeer(System.Action accionTerminar)
     
    {
        UnityWebRequest web = UnityWebRequest.Get(url_lectura);
        yield return web.SendWebRequest();
        //Esperamos a que vuelva

        if (!web.isNetworkError && !web.isHttpError)
        {
            //Todo Ok
            Debug.Log(web.downloadHandler.text);
            gameOver = false;
            string userDataString = web.downloadHandler.text;
            userData = userDataString.Split(';');
            accionTerminar();
        }
        else
        {
            Debug.LogWarning("Error al leer del servidor");
            gameOver = true;
        }
    }

        string GetValuesData(string data, string index){
                 string value = data.Substring(data.IndexOf(index)+index.Length);  
                 if (value.Contains("|"))
                 {
                     value = value.Remove(value.IndexOf("|"));
                 }
                 return value;
        }

    
     [ContextMenu("Escribir")]  
     public void Escribir(){
        StartCoroutine(CorrutinaEscribir());
   }

     private IEnumerator CorrutinaEscribir()
    {
        WWWForm form = new WWWForm();
        form.AddField ("name", nameActivo);
        form.AddField ("puntos", miPuntaje.ToString());
        if (nameActivo != "")
        {
        UnityWebRequest web = UnityWebRequest.Post(url_escritura, form);
        yield return web.SendWebRequest();
        //Esperamos a que vuelva

        if (!web.isNetworkError && !web.isHttpError) 
        {
            
               //Todo Ok
            Debug.Log(web.downloadHandler.text);
            miPuntaje = 0;
            Leer(PasarDatosTabla);
                   
        }
        else
        {
            Debug.LogWarning("Error al escribir en el servidor");
            
        } 
      }
       
    }

     [ContextMenu("Login")]  
     IEnumerator Login ()
	{
	    WWWForm form = new WWWForm();
       
        form.AddField ("name", miNombre.text);

		UnityWebRequest w = UnityWebRequest.Post(url, form);
		yield return w.SendWebRequest();

		if (w.isHttpError) {
			errorMessages.text = "404 not found!";
			Debug.Log("<color=red>"+w.downloadHandler.text+"</color>");//error
		} else {
			if (w.isDone) {
				if (w.downloadHandler.text.Contains ("error")) {
					errorMessages.text = "No existe el usuario!";
					Debug.Log("<color=red>"+w.downloadHandler.text+"</color>");//error
                    noUser = true;
				} else {
					//open welcom panel
					
					Debug.Log("<color=green>"+w.downloadHandler.text+"</color>");//user exist
                    //Aqui Comprobar si es realmente el usuario capturando name desde Server(escenario login) y guardandolo en un singleton
                    noUser = false;
				}
			}
		}
		
		w.Dispose ();
        yield return noUser;
	}


    //----------------------------------------- Fin Método con Base de Datos

    //----------------------------------------- Método con JSon
   
   /*
    [ContextMenu("Leer")]
    public void Leer(System.Action accionTerminar)
    //public void Leer()
    {
       StartCoroutine(CorrutinaLeer(accionTerminar));
       //StartCoroutine(CorrutinaLeer());
      
    }

    private IEnumerator CorrutinaLeer(System.Action accionTerminar)
     //private IEnumerator CorrutinaLeer()
    {
        UnityWebRequest web = UnityWebRequest.Get(url_lectura);
        //UnityWebRequest web = UnityWebRequest.Get("http://gameagr.atspace.eu/cufireJson.txt");
        //UnityWebRequest web = UnityWebRequest.Get("http://studyart.medianewsonline.com/cufire/cufiret.txt");
        //UnityWebRequest web = UnityWebRequest.Get("http://gamefree.infinityfreeapp.com/cufire/cufire4.txt");
        
        yield return web.SendWebRequest();
        //Esperamos a que vuelva

        if (!web.isNetworkError && !web.isHttpError)
        {
            //Todo Ok
            Debug.Log(web.downloadHandler.text);
            gameOver = false;
            datos = JsonUtility.FromJson<estructuraDatosWeb>(web.downloadHandler.text);
            accionTerminar();
        }
        else
        {
            Debug.LogWarning("Error al leer del servidor");
            gameOver = true;
        }
    }

    
     [ContextMenu("Escribir")]  
     public void Escribir(){
        StartCoroutine(CorrutinaEscribir());
   }

     private IEnumerator CorrutinaEscribir()
    {
        WWWForm form = new WWWForm();
        form.AddField("archivo", "f.txt");
        form.AddField("texto", JsonUtility.ToJson(datos));
        UnityWebRequest web = UnityWebRequest.Post(url_escritura, form);
        //UnityWebRequest web = UnityWebRequest.Post("http://studyart.medianewsonline.com/cufire/cufire.php", form); 
        //UnityWebRequest web = UnityWebRequest.Post("http://gamefree.infinityfreeapp.com/cufire/cufire.php", form);
        yield return web.SendWebRequest();
        //Esperamos a que vuelva

        if (!web.isNetworkError && !web.isHttpError)
        {
            //Todo Ok
            Debug.Log(web.downloadHandler.text);
        
        }
        else
        {
            Debug.LogWarning("Error al escribir en el servidor");
            
        }
    }

    /* [ContextMenu("Login")]  
     IEnumerator Login ()
	{
	    WWWForm form = new WWWForm();
       
        form.AddField ("name", miNombre.text);

		UnityWebRequest w = UnityWebRequest.Post(url, form);
		yield return w.SendWebRequest();

		if (w.isHttpError) {
			errorMessages.text = "404 not found!";
			Debug.Log("<color=red>"+w.downloadHandler.text+"</color>");//error
		} else {
			if (w.isDone) {
				if (w.downloadHandler.text.Contains ("error")) {
					errorMessages.text = "No existe el usuario!";
					Debug.Log("<color=red>"+w.downloadHandler.text+"</color>");//error
                    noUser = true;
				} else {
					//open welcom panel
					
					Debug.Log("<color=green>"+w.downloadHandler.text+"</color>");//user exist
                    //Aqui Comprobar si es realmente el usuario capturando name desde Server(escenario login) y guardandolo en un singleton
                    noUser = false;
				}
			}
		}
		
		w.Dispose ();
        yield return noUser;
	}
              */        

    //----------------------------------------- Fin Método con JSon


    //----------------------------------------- Método sin JSon
/*
    [ContextMenu("Leer")]
    //public void Leer(System.Action accionTerminar)
    public void Leer(System.Action accionTerminar){
       //StartCoroutine(CorrutinaLeer(accionTerminar));
       StartCoroutine(CorrutinaLeer(accionTerminar));
      
    }

    private IEnumerator CorrutinaLeer(System.Action accionTerminar)
    {
        UnityWebRequest web = UnityWebRequest.Get(url_lectura);
        //UnityWebRequest web = UnityWebRequest.Get("http://gameagr.atspace.eu/cufireSinJson.txt");
        
        yield return web.SendWebRequest();
        //Esperamos a que vuelva

        if (!web.isNetworkError && !web.isHttpError)
        {
            //Todo Ok
            Debug.Log(web.downloadHandler.text);
            string textOrig = web.downloadHandler.text;
            partes = textOrig.Split('♣');
            name = partes[0];
            ptos = int.Parse(partes[1]);
            
        }
        else
        {
            Debug.LogWarning("Error al leer del servidor");
        }
    }
    
     [ContextMenu("Escribir")]
     public void Escribir(){
        StartCoroutine(CorrutinaEscribir());
   }

     private IEnumerator CorrutinaEscribir()
    {
        WWWForm form = new WWWForm();
        form.AddField("archivo", "cuf.txt");
        form.AddField("texto", name + "♣" + ptos.ToString());
        UnityWebRequest web = UnityWebRequest.Post(url_escritura, form);
        //UnityWebRequest web = UnityWebRequest.Post("http://gameagr.atspace.eu/cufire.php", form);
        yield return web.SendWebRequest();
        //Esperamos a que vuelva

        if (!web.isNetworkError && !web.isHttpError)
        {
            //Todo Ok
            Debug.Log(web.downloadHandler.text);

        }
        else
        {
            Debug.LogWarning("Error al escribir en el servidor");
        }
    } 


    [ContextMenu("Login")]  
     IEnumerator Login ()
	{
	    WWWForm form = new WWWForm();
       
        form.AddField ("name", miNombre.text);

		UnityWebRequest w = UnityWebRequest.Post(url, form);
		yield return w.SendWebRequest();

		if (w.isHttpError) {
			errorMessages.text = "404 not found!";
			Debug.Log("<color=red>"+w.downloadHandler.text+"</color>");//error
		} else {
			if (w.isDone) {
				if (w.downloadHandler.text.Contains ("error")) {
					errorMessages.text = "No existe el usuario!";
					Debug.Log("<color=red>"+w.downloadHandler.text+"</color>");//error
                    noUser = true;
				} else {
					//open welcom panel
					
					Debug.Log("<color=green>"+w.downloadHandler.text+"</color>");//user exist
                    //Aqui Comprobar si es realmente el usuario capturando name desde Server(escenario login) y guardandolo en un singleton
                    noUser = false;
				}
			}
		}
		
		w.Dispose ();
        yield return noUser;
	}


    //---------------------------------------- Fin Método sin JSon
   */

      [ContextMenu("Crear Tabla")]
      void CrearTabla(){
          for (var i = 0; i < cantidadRegistro; i++)
          {
              GameObject inst = Instantiate(plantillaRegistros, tabla);
              inst.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, i * -40f);
              inst.name = i.ToString();     
          }
      }

      [ContextMenu("Pasar Datos a Tabla")]
      public void PasarDatosTabla(){
          for (var i = 0; i < cantidadRegistro; i++)
          {
              //Para Método fichero txt en formato JSon 
             /* tabla.GetChild(i).GetChild(0).GetComponent<TMPro.TextMeshProUGUI>().text = datos.registros[i].nombre;  
              tabla.GetChild(i).GetChild(1).GetComponent<TMPro.TextMeshProUGUI>().text = datos.registros[i].puntaje.ToString(); */
             
             //Para Método Base Datos     
              tabla.GetChild(i).GetChild(0).GetComponent<TMPro.TextMeshProUGUI>().text = GetValuesData(userData[i], "username");  
              tabla.GetChild(i).GetChild(1).GetComponent<TMPro.TextMeshProUGUI>().text = GetValuesData(userData[i], "|Puntos");

              
          }
      }

    

      
       [ContextMenu("Chequear si corresponde")]
     public void ChequearCorrespondeNuevoHiscore(){

          // Esto es para Método Json ***// if (miPuntaje > datos.registros[cantidadRegistro -1].puntaje)
          
                //Debug.Log(int.Parse(GetValuesData(userData[i], "|Puntos")));
          
        for (var i = 0; i < cantidadRegistro; i++)
        {
              if (miPuntaje > (int.Parse(GetValuesData(userData[i], "|Puntos")))) //Método BaseDatos
                {
              
              //si corresponde
              corresponde = true;
              tabla.gameObject.SetActive(false);
              nuevo.gameObject.SetActive(true);
              game.gameObject.SetActive(false); 
              score.gameObject.SetActive(true);
              salir.gameObject.SetActive(false); 
             }
             else
              {
              corresponde = false;
              tabla.gameObject.SetActive(true);
              nuevo.gameObject.SetActive(false);
              game.gameObject.SetActive(true); 
              score.gameObject.SetActive(false);
              salir.gameObject.SetActive(true); 
              }
               
        } 
     
      }

       [ContextMenu("Insertar registro")]
       void InsertarNuevoregistro(){
           //Saber en que posicion tiene que insertar
           for (var i = 0; i < cantidadRegistro; i++)
          {
              if (miPuntaje > datos.registros[i].puntaje)
              {
                  //inserto si el campo inputTextMeshPro no esta vacio
                  if (miNombre.text != "")  // && noUser == false
                  {
                      
                      datos.registros.Insert(i, new estructuraDatosWeb.registro(){
                      nombre = miNombre.text,
                      puntaje = miPuntaje
                     });
                     miPuntaje = 0;
                     break; //salir del for   
                     
                      
                  }else{
                      errorMessages.text = "No existe el usuario!";
					  Debug.Log("<color=red>"+errorMessages.text+"</color>");//error
                       }
            
              }
          }
       }


  
       public void Jugar(){
             SceneManager.LoadScene("nivel1");
       }


    
        public void Salir(){

        #if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
        #else
        Application.Quit();
        #endif
    
    }
   //Fin de la función cerrar el juego en Unity

       private void Awake() {
           Cursor.lockState = CursorLockMode.None;
           Cursor.visible = true;
           
       }

       private void Start() {
                sonido = myCamera.GetComponent<AudioSource>();
                sonido.Stop();
                sonido.Play();
                miPuntaje =  SingletonPtos.inst.puntos; 
                nameActivo = UserLogued.user.userLogued;
                userActivo.text = nameActivo;
                 //Leer();
                 Leer(CrearTablaPasarDatosChequear);
                // score.gameObject.SetActive(active); 
         
          
       }
       
             
       private void Update() {

           //Leo para Comprobar si el fichero existe en el servidor
           if (gameOver == true)
           {
                tabla.gameObject.SetActive(false);
                nuevo.gameObject.SetActive(false);
                game.gameObject.SetActive(false); 
                score.gameObject.SetActive(false);

           }   

              if (gameOver == false){

                 if(miPuntaje > 0){
                 ChequearCorrespondeNuevoHiscore();
                 }else if(miPuntaje == 0){
                  
             tabla.gameObject.SetActive(true);
             nuevo.gameObject.SetActive(false);
             game.gameObject.SetActive(true);
             score.gameObject.SetActive(false);
             salir.gameObject.SetActive(true); 
               }
            }
               
       }

      

   
       //[ContextMenu("CrearTablaPasarDatosChequear")] 
       void CrearTablaPasarDatosChequear(){
           CrearTabla();
           PasarDatosTabla();
           ChequearCorrespondeNuevoHiscore();

       }

       public void inputTermino(){
              nuevo.gameObject.SetActive(false);
              tabla.gameObject.SetActive(true);
              //StartCoroutine (Login ());
              Leer(InsertarYEscribir);
              
              
       }
       
     
       //[ContextMenu("InsertarYEscribir")] 
       void InsertarYEscribir(){
            //ChequearCorrespondeNuevoHiscore();
            //InsertarNuevoregistro();
            Escribir();
           
         }

}
