"use strict";

const loginForm = document.querySelector("#login-form");
const roleSelect = document.querySelector("#role");
const formError = document.querySelector("#form-error");

const rolePages = {
  encargado: "pages/encargado.html",
  tecnico: "pages/tecnico.html",
  admin: "pages/admin.html",
};

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!loginForm.checkValidity()) {
    formError.textContent = "Completa todos los campos obligatorios.";
    loginForm.reportValidity();
    return;
  }

  formError.textContent = "";
  window.location.href = rolePages[roleSelect.value];
});
