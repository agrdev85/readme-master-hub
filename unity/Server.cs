using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.SceneManagement;
using UnityEngine.Networking;

public class Server : MonoBehaviour
{
   
  
	[SerializeField] GameObject loginPanel;
	[SerializeField] GameObject welcomePanel;
	public Text user;
	
	
	[Space]
	[SerializeField] InputField username;
	[SerializeField] InputField password;

	[SerializeField] Text errorMessages;
	[SerializeField] GameObject progressCircle;


	[SerializeField] Button loginButton;

	
	[SerializeField] string url;

	WWWForm form;

	public void OnLoginButtonClicked ()
	{
		loginButton.interactable = false;
		progressCircle.SetActive (true);
		StartCoroutine (Login ());
	
	}


	public void LogOut(){
		loginPanel.SetActive (true);
		welcomePanel.SetActive (false);
		errorMessages.text = "";
		user.text = "";
		username.text = "";
		password.text = "";
		loginButton.interactable = true;
		progressCircle.SetActive (false);
	}

	public void Jugar(){
		  SceneManager.LoadScene("Hiscore");
       }

    
	public void Salir(){

        #if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
        #else
        Application.Quit();
        #endif
    
    }
   //Fin de la función cerrar el juego en Unity

    public void EnlaceExterno(string enlace){

           Application.OpenURL(enlace);
	}


    IEnumerator Login ()
	{
	    form = new WWWForm();

        form.AddField ("name", username.text);
		form.AddField ("password", password.text);

		//WWW w = new WWW(url, form);
		UnityWebRequest w = UnityWebRequest.Post(url, form);
		yield return w.SendWebRequest();
		
		if (w.isNetworkError || w.isHttpError) {
			errorMessages.text = "404 not found!";
			Debug.Log("<color=red>"+w.downloadHandler.text+"</color>");//error
		} else {
			if (w.isDone) {
				if (w.downloadHandler.text.Contains ("error")) {
					errorMessages.text = "Name o Password Invalid!";
					Debug.Log("<color=red>"+w.downloadHandler.text+"</color>");//error
				} else {
					//open welcom panel
					loginPanel.SetActive (false);
					welcomePanel.SetActive (true);
					user.text = username.text;
					Debug.Log("<color=green>"+w.downloadHandler.text+"</color>");//user exist
				}
			}
		}
		

		loginButton.interactable = true;
		progressCircle.SetActive (false);

		w.Dispose ();
		
	}

	 
}
