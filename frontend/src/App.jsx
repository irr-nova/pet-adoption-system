import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

const API_URL =
  "https://pet-adoption-system-p7pu.onrender.com";

const FRONTEND_URL =
  "https://pet-adoption-frontend-svts.onrender.com";


const petImages = {
  dog: [
    "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1558911922-9e5b5d5a2d09?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1553882809-a4f57e9f8a5d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80",
  ],

  cat: [
    "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1495366823158-5f6b1f8e1f8b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1571566882372-1598d88abd90?auto=format&fit=crop&w=900&q=80",
  ],
};


function getPetImage(pet) {
  const type =
    pet.animal_type?.toLowerCase() === "cat"
      ? "cat"
      : "dog";

  const images = petImages[type];

  const index =
    ((pet.id * 7) + 3) % images.length;

  return images[index];
}


function App() {

  const [session, setSession] =
    useState(null);

  const [token, setToken] =
    useState(null);

  const [user, setUser] =
    useState(null);

  const [pets, setPets] =
    useState([]);

  const [favorites, setFavorites] =
    useState([]);

  const [myRequests, setMyRequests] =
    useState([]);

  const [
    receivedRequests,
    setReceivedRequests,
  ] = useState([]);


  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("All");


  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const [showAuth, setShowAuth] =
    useState(false);

  const [authMode, setAuthMode] =
    useState("login");


  const [
    authLoading,
    setAuthLoading,
  ] = useState(false);

  const [
    authMessage,
    setAuthMessage,
  ] = useState("");

  const [
    authError,
    setAuthError,
  ] = useState("");


  const [
    showForgotPassword,
    setShowForgotPassword,
  ] = useState(false);

  const [
    forgotEmail,
    setForgotEmail,
  ] = useState("");

  const [
    forgotLoading,
    setForgotLoading,
  ] = useState(false);


  const [
    showResetPassword,
    setShowResetPassword,
  ] = useState(false);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmNewPassword,
    setConfirmNewPassword,
  ] = useState("");

  const [
    resetLoading,
    setResetLoading,
  ] = useState(false);


  const [
    showAddForm,
    setShowAddForm,
  ] = useState(false);


  const [
    selectedPet,
    setSelectedPet,
  ] = useState(null);


  const [
    requestPet,
    setRequestPet,
  ] = useState(null);

  const [
    requestMessage,
    setRequestMessage,
  ] = useState("");


  const [
    showRequests,
    setShowRequests,
  ] = useState(false);


  const [
    editingPet,
    setEditingPet,
  ] = useState(null);


  const [
    showDeleteAccount,
    setShowDeleteAccount,
  ] = useState(false);

  const [
    deleteLoading,
    setDeleteLoading,
  ] = useState(false);


  // NEW:
  // Wait until Supabase has finished restoring
  // the saved login session before loading user data.

  const [
    authInitialized,
    setAuthInitialized,
  ] = useState(false);


  const [authForm, setAuthForm] =
    useState({
      name: "",
      email: "",
      password: "",
      phone: "",
    });


  const [petForm, setPetForm] =
    useState({
      name: "",
      animal_type: "Dog",
      age: "",
      available_for_adoption: true,
    });


  // ============================================================
  // API HELPER
  // ============================================================

  async function apiFetch(
    endpoint,
    options = {},
  ) {

    const headers = {
      "Content-Type":
        "application/json",

      ...(options.headers || {}),
    };


    let currentToken = token;


    if (!currentToken) {

      const {
        data: {
          session: currentSession,
        },
      } =
        await supabase.auth.getSession();


      currentToken =
        currentSession?.access_token ||
        null;
    }


    if (currentToken) {

      headers.Authorization =
        `Bearer ${currentToken}`;

    }


    const response =
      await fetch(
        `${API_URL}${endpoint}`,
        {
          ...options,
          headers,
        },
      );


    let data = null;


    try {

      data =
        await response.json();

    } catch {

      data = null;

    }


    if (!response.ok) {

      throw new Error(
        data?.detail ||
          "Something went wrong",
      );

    }


    return data;

  }


  // ============================================================
  // LOAD CURRENT USER
  // ============================================================

  async function loadCurrentUser() {

    if (!token) {

      setUser(null);

      return;

    }


    try {

      const data =
        await apiFetch("/me");

      setUser(data);

    } catch {

      setUser(null);

    }

  }


  // ============================================================
  // LOAD PETS
  // ============================================================

  async function fetchPets() {

    setLoading(true);

    setError("");


    try {

      const data =
        await apiFetch("/pets");

      setPets(data);

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }

  }


  // ============================================================
  // LOAD FAVORITES
  // ============================================================

  async function fetchFavorites() {

    if (!token) {

      setFavorites([]);

      return;

    }


    try {

      const data =
        await apiFetch(
          "/favorites",
        );


      setFavorites(data);

    } catch {

      setFavorites([]);

    }

  }


  // ============================================================
  // LOAD ADOPTION REQUESTS
  // ============================================================

  async function fetchAdoptionRequests() {

    if (!token) {

      setMyRequests([]);

      setReceivedRequests([]);

      return;

    }


    try {

      const [
        mine,
        received,
      ] =
        await Promise.all([
          apiFetch(
            "/adoption-requests/mine",
          ),

          apiFetch(
            "/adoption-requests/received",
          ),
        ]);


      setMyRequests(mine);

      setReceivedRequests(
        received,
      );

    } catch {

      setMyRequests([]);

      setReceivedRequests([]);

    }

  }


  // ============================================================
  // SUPABASE AUTH STATE
  // ============================================================

  useEffect(() => {

    let mounted = true;


    async function initializeAuth() {

      try {

        const {
          data: {
            session: currentSession,
          },
        } =
          await supabase.auth.getSession();


        if (!mounted) {

          return;

        }


        setSession(
          currentSession,
        );


        setToken(
          currentSession?.access_token ||
            null,
        );


        setAuthInitialized(
          true,
        );

      } catch (error) {

        console.error(
          "Failed to restore Supabase session:",
          error,
        );


        if (mounted) {

          setSession(null);

          setToken(null);

          setAuthInitialized(true);

        }

      }

    }


    initializeAuth();


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          currentSession,
        ) => {

          if (!mounted) {

            return;

          }


          setSession(
            currentSession,
          );


          setToken(
            currentSession?.access_token ||
              null,
          );


          setAuthInitialized(
            true,
          );


          if (
            event ===
            "PASSWORD_RECOVERY"
          ) {

            setShowResetPassword(
              true,
            );

            setShowAuth(false);

          }


          if (
            event === "SIGNED_OUT"
          ) {

            setUser(null);

            setFavorites([]);

            setMyRequests([]);

            setReceivedRequests([]);

          }

        },
      );


    return () => {

      mounted = false;

      subscription.unsubscribe();

    };

  }, []);


  // ============================================================
  // LOAD PETS
  // ============================================================

  useEffect(() => {

    fetchPets();

  }, []);


  // ============================================================
  // LOAD USER-SPECIFIC DATA
  // ============================================================

  useEffect(() => {

    if (!authInitialized) {

      return;

    }


    loadCurrentUser();

    fetchFavorites();

    fetchAdoptionRequests();

  }, [
    token,
    authInitialized,
  ]);


  // ============================================================
  // OPEN PET FROM SHARED LINK
  // ============================================================

  useEffect(() => {

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const petId =
      params.get("pet");


    if (!petId || pets.length === 0) {

      return;

    }


    const sharedPet =
      pets.find(
        (pet) =>
          String(pet.id) ===
          String(petId),
      );


    if (!sharedPet) {

      console.warn(
        "Shared pet not found:",
        petId,
      );

      return;

    }


    setSelectedPet(
      sharedPet,
    );

  }, [pets]);


  // ============================================================
  // AUTHENTICATION
  // ============================================================

  async function handleAuthSubmit(
    event,
  ) {

    event.preventDefault();


    setAuthLoading(true);

    setAuthMessage("");

    setAuthError("");


    try {

      if (
        authMode ===
        "register"
      ) {

        const {
          data,
          error: signUpError,
        } =
          await supabase.auth.signUp({
            email:
              authForm.email,

            password:
              authForm.password,

            options: {

              emailRedirectTo:
                window.location.origin,

              data: {

                name:
                  authForm.name,

                phone:
                  authForm.phone ||
                  null,

              },

            },

          });


        if (signUpError) {

          throw signUpError;

        }


        if (!data.session) {

          setAuthMessage(
            "Account created! Please check your email and click the verification link before logging in.",
          );

        } else {

          setAuthMessage(
            "Account created successfully.",
          );

        }


        setAuthForm({
          name: "",
          email:
            authForm.email,
          password: "",
          phone: "",
        });


        setAuthMode(
          "login",
        );


        return;

      }


      const {
        data,
        error: signInError,
      } =
        await supabase.auth
          .signInWithPassword({

            email:
              authForm.email,

            password:
              authForm.password,

          });


      if (signInError) {

        throw signInError;

      }


      setSession(
        data.session,
      );


      setToken(
        data.session
          ?.access_token ||
          null,
      );


      setAuthForm({
        name: "",
        email: "",
        password: "",
        phone: "",
      });


      setShowAuth(false);

      setAuthMessage("");

      setAuthError("");

    } catch (err) {

      setAuthError(
        err.message ||
          "Authentication failed.",
      );

    } finally {

      setAuthLoading(false);

    }

  }


  // ============================================================
  // GOOGLE LOGIN
  // ============================================================

  async function handleGoogleLogin() {

    setAuthLoading(true);

    setAuthError("");

    setAuthMessage("");


    try {

      const {
        error: googleError,
      } =
        await supabase.auth
          .signInWithOAuth({

            provider:
              "google",

            options: {

              redirectTo:
                window.location.origin,

            },

          });


      if (googleError) {

        throw googleError;

      }

    } catch (err) {

      setAuthError(
        err.message ||
          "Google sign-in failed.",
      );


      setAuthLoading(false);

    }

  }


  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  async function handleForgotPassword(
    event,
  ) {

    event.preventDefault();


    if (!forgotEmail) {

      setAuthError(
        "Please enter your email address.",
      );

      return;

    }


    setForgotLoading(true);

    setAuthError("");

    setAuthMessage("");


    try {

      const {
        error: resetError,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            forgotEmail,
            {

              redirectTo:
                window.location.origin,

            },
          );


      if (resetError) {

        throw resetError;

      }


      setAuthMessage(
        "If an account exists with that email, a password reset link has been sent.",
      );

    } catch (err) {

      setAuthError(
        err.message ||
          "Unable to send password reset email.",
      );

    } finally {

      setForgotLoading(false);

    }

  }


  // ============================================================
  // RESET PASSWORD
  // ============================================================

  async function handleResetPassword(
    event,
  ) {

    event.preventDefault();


    if (
      newPassword.length < 8
    ) {

      setAuthError(
        "Password must be at least 8 characters.",
      );

      return;

    }


    if (
      newPassword !==
      confirmNewPassword
    ) {

      setAuthError(
        "Passwords do not match.",
      );

      return;

    }


    setResetLoading(true);

    setAuthError("");

    setAuthMessage("");


    try {

      const {
        error: updateError,
      } =
        await supabase.auth.updateUser({

          password:
            newPassword,

        });


      if (updateError) {

        throw updateError;

      }


      setAuthMessage(
        "Password updated successfully. You are now logged in.",
      );


      setNewPassword("");

      setConfirmNewPassword("");


      setTimeout(() => {

        setShowResetPassword(
          false,
        );

      }, 1000);

    } catch (err) {

      setAuthError(
        err.message ||
          "Unable to update password.",
      );

    } finally {

      setResetLoading(false);

    }

  }


  // ============================================================
  // LOGOUT
  // ============================================================

  async function logout() {

    await supabase.auth.signOut();


    setSession(null);

    setToken(null);

    setUser(null);

    setFavorites([]);

    setMyRequests([]);

    setReceivedRequests([]);

  }


  // ============================================================
  // DELETE ACCOUNT
  // ============================================================

  async function handleDeleteAccount() {

    const confirmed =
      window.confirm(
        "Are you absolutely sure you want to delete your PawConnect account? This will permanently delete your account, pets, favorites and adoption activity. This action cannot be undone.",
      );


    if (!confirmed) {

      return;

    }


    setDeleteLoading(true);


    try {

      await apiFetch(
        "/account",
        {
          method: "DELETE",
        },
      );


      await supabase.auth.signOut();


      setSession(null);

      setToken(null);

      setUser(null);

      setFavorites([]);

      setMyRequests([]);

      setReceivedRequests([]);

      setShowDeleteAccount(
        false,
      );


      alert(
        "Your PawConnect account has been deleted successfully.",
      );


      window.location.hash =
        "pets";


    } catch (err) {

      alert(
        err.message ||
          "Unable to delete account.",
      );

    } finally {

      setDeleteLoading(false);

    }

  }


  // ============================================================
  // FAVORITES
  // ============================================================

  async function toggleFavorite(
    petId,
  ) {

    if (!user) {

      setAuthMode(
        "login",
      );

      setShowAuth(true);

      return;

    }


    try {

      if (
        favorites.includes(
          petId,
        )
      ) {

        await apiFetch(
          `/favorites/${petId}`,
          {
            method:
              "DELETE",
          },
        );


        setFavorites(
          favorites.filter(
            (id) =>
              id !== petId,
          ),
        );

      } else {

        await apiFetch(
          `/favorites/${petId}`,
          {
            method:
              "POST",
          },
        );


        setFavorites([
          ...favorites,
          petId,
        ]);

      }

    } catch (err) {

      alert(err.message);

    }

  }


  // ============================================================
  // ADOPTION REQUEST
  // ============================================================

  function openAdoptionRequest(
    pet,
  ) {

    if (!user) {

      setAuthMode(
        "login",
      );

      setShowAuth(true);

      return;

    }


    if (
      pet.owner_id ===
      user.id
    ) {

      alert(
        "You cannot request adoption for your own pet.",
      );

      return;

    }


    setRequestPet(pet);

    setRequestMessage("");

  }


  async function submitAdoptionRequest(
    event,
  ) {

    event.preventDefault();


    if (!requestPet) {

      return;

    }


    try {

      await apiFetch(
        `/pets/${requestPet.id}/adoption-request`,
        {

          method:
            "POST",

          body:
            JSON.stringify({

              message:
                requestMessage,

            }),

        },
      );


      alert(
        "Adoption request sent. The owner can now review your details and contact you.",
      );


      setRequestPet(null);

      setRequestMessage("");


      await fetchAdoptionRequests();

    } catch (err) {

      alert(err.message);

    }

  }


  // ============================================================
  // ADOPTION REQUEST DECISION
  // ============================================================

  async function decideRequest(
    requestId,
    decision,
  ) {

    const message =
      decision === "accepted"
        ? "Accept this adoption request?"
        : "Reject this adoption request?";


    if (
      !window.confirm(
        message,
      )
    ) {

      return;

    }


    try {

      await apiFetch(
        `/adoption-requests/${requestId}`,
        {

          method:
            "PUT",

          body:
            JSON.stringify({

              decision,

            }),

        },
      );


      await fetchPets();

      await fetchAdoptionRequests();


      alert(
        decision ===
        "accepted"
          ? "Request accepted. The pet is now marked as adopted."
          : "Request rejected.",
      );

    } catch (err) {

      alert(err.message);

    }

  }


  // ============================================================
  // ADD PET
  // ============================================================

  async function handleAddPet(
    event,
  ) {

    event.preventDefault();


    try {

      await apiFetch(
        "/pets",
        {

          method:
            "POST",

          body:
            JSON.stringify({

              name:
                petForm.name,

              animal_type:
                petForm.animal_type,

              age:
                Number(
                  petForm.age,
                ),

              available_for_adoption:
                petForm.available_for_adoption,

            }),

        },
      );


      setPetForm({

        name: "",

        animal_type:
          "Dog",

        age: "",

        available_for_adoption:
          true,

      });


      setShowAddForm(
        false,
      );


      await fetchPets();


      alert(
        "Pet added successfully.",
      );

    } catch (err) {

      alert(err.message);

    }

  }


  // ============================================================
  // EDIT PET
  // ============================================================

  function startEditing(
    pet,
  ) {

    setEditingPet({

      ...pet,

      age:
        String(
          pet.age,
        ),

    });


    setSelectedPet(null);

  }


  async function handleEditPet(
    event,
  ) {

    event.preventDefault();


    try {

      await apiFetch(
        `/pets/${editingPet.id}`,
        {

          method:
            "PUT",

          body:
            JSON.stringify({

              name:
                editingPet.name,

              animal_type:
                editingPet.animal_type,

              age:
                Number(
                  editingPet.age,
                ),

              available_for_adoption:
                editingPet.available_for_adoption,

            }),

        },
      );


      setEditingPet(null);


      await fetchPets();


      alert(
        "Pet updated successfully.",
      );

    } catch (err) {

      alert(err.message);

    }

  }


  // ============================================================
  // DELETE PET
  // ============================================================

  async function deletePet(
    petId,
  ) {

    if (
      !window.confirm(
        "Are you sure you want to delete this pet?",
      )
    ) {

      return;

    }


    try {

      await apiFetch(
        `/pets/${petId}`,
        {

          method:
            "DELETE",

        },
      );


      setSelectedPet(null);


      await fetchPets();


      alert(
        "Pet deleted successfully.",
      );

    } catch (err) {

      alert(err.message);

    }

  }


  // ============================================================
  // SHARE
  // ============================================================

  async function sharePet(
    pet,
  ) {

    const shareUrl =
      `${FRONTEND_URL}/?pet=${pet.id}`;


    try {

      if (
        navigator.share
      ) {

        await navigator.share({

          title:
            `${pet.name} - PawConnect`,

          text:
            `Check out ${pet.name} on PawConnect!`,

          url:
            shareUrl,

        });

      } else {

        await navigator.clipboard
          .writeText(
            shareUrl,
          );


        alert(
          "Pet link copied to clipboard.",
        );

      }

    } catch (error) {

      if (
        error?.name !==
        "AbortError"
      ) {

        console.error(
          "Failed to share pet:",
          error,
        );

      }

    }

  }


  // ============================================================
  // FILTERED PETS
  // ============================================================

  const filteredPets =
    pets.filter((pet) => {

      const matchesSearch =
        pet.name
          .toLowerCase()
          .includes(
            search.toLowerCase(),
          );


      const matchesFilter =
        filter === "All" ||
        pet.animal_type
          .toLowerCase() ===
          filter.toLowerCase();


      return (
        matchesSearch &&
        matchesFilter
      );

    });


  const myPets =
    user
      ? pets.filter(
          (pet) =>
            pet.owner_id ===
            user.id,
        )
      : [];


  const favoritePets =
    user
      ? pets.filter(
          (pet) =>
            favorites.includes(
              pet.id,
            ),
        )
      : [];


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="app">


      {/* NAVBAR */}

      <nav className="navbar">

        <div className="logo">

          <span className="logo-icon">
            🐾
          </span>

          PawConnect

        </div>


        <div className="nav-links">

          <a href="#pets">
            Find a Pet
          </a>


          {user && (
            <>

              <a href="#favorites">
                Favorites
              </a>


              <a href="#my-pets">
                My Pets
              </a>


              <button
                className="nav-button"
                onClick={() =>
                  setShowRequests(
                    true,
                  )
                }
              >

                Requests


                {receivedRequests.filter(
                  (request) =>
                    request.status ===
                    "Pending",
                ).length > 0 && (

                  <span>

                    {" "}

                    (

                    {
                      receivedRequests.filter(
                        (
                          request,
                        ) =>
                          request.status ===
                          "Pending",
                      ).length
                    }

                    )

                  </span>

                )}

              </button>

            </>
          )}

        </div>


        {user ? (

          <div className="user-menu">

            <span>
              Hi, {user.name}
            </span>


            <button
              className="nav-button"
              onClick={logout}
            >
              Logout
            </button>


            <button
              className="delete-account-button"
              onClick={() =>
                setShowDeleteAccount(
                  true,
                )
              }
            >
              Delete Account
            </button>

          </div>

        ) : (

          <button
            className="nav-button"
            onClick={() => {

              setAuthMode(
                "login",
              );

              setAuthMessage(
                "",
              );

              setAuthError(
                "",
              );

              setShowAuth(
                true,
              );

            }}
          >
            Log in
          </button>

        )}

      </nav>


      {/* HERO */}

      <section className="hero-section">

        <div className="hero-content">

          <p className="eyebrow">
            FIND YOUR NEW BEST FRIEND
          </p>


          <h1>

            Every pet deserves

            <br />

            a{" "}

            <span>
              loving home.
            </span>

          </h1>


          <p className="hero-text">

            Discover pets looking for
            their forever homes and
            connect directly with
            responsible pet owners.

          </p>


          <div className="search-box">

            <span>
              ⌕
            </span>


            <input
              type="text"
              placeholder="Search by pet name..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />

          </div>

        </div>


        <div className="hero-decoration">

          <div className="hero-circle">
          </div>


          <div className="hero-paw">
            🐾
          </div>

        </div>

      </section>


      {/* PETS */}

      <section
        className="pets-section"
        id="pets"
      >

        <div className="section-heading">

          <h2>
            Pets looking for homes
          </h2>


          <div className="filters">

            {[
              "All",
              "Dog",
              "Cat",
            ].map(
              (type) => (

                <button
                  key={type}
                  className={
                    filter === type
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(type)
                  }
                >
                  {type}
                </button>

              ),
            )}

          </div>

        </div>


        {loading ? (

          <div className="loading-state">

            <div className="loading-paw">
              🐾
            </div>


            <h3>
              Finding pets...
            </h3>


            <p>
              Please wait while we
              load the latest listings.
            </p>

          </div>

        ) : error ? (

          <div className="error-state">

            <div className="error-icon">
              ⚠️
            </div>


            <h3>
              Couldn't load pets
            </h3>


            <p>
              {error}
            </p>


            <button
              className="retry-button"
              onClick={fetchPets}
            >
              Try Again
            </button>

          </div>

        ) : filteredPets.length ===
          0 ? (

          <div className="empty-state">

            <span>
              🐾
            </span>


            <h3>
              No pets found
            </h3>


            <p>
              Try another search or
              filter.
            </p>

          </div>

        ) : (

          <div className="pet-grid">

            {filteredPets.map(
              (pet) => {

                const isOwner =
                  user?.id ===
                  pet.owner_id;


                const pendingRequest =
                  myRequests.some(
                    (request) =>
                      request.pet_id ===
                        pet.id &&
                      request.status ===
                        "Pending",
                  );


                return (

                  <div
                    className="pet-card"
                    key={pet.id}
                  >

                    <div className="pet-image-wrapper">

                      <img
                        src={
                          getPetImage(
                            pet,
                          )
                        }
                        alt={
                          pet.name
                        }
                      />


                      {pet.available_for_adoption && (

                        <span className="available-badge">
                          Available
                        </span>

                      )}

                    </div>


                    <div className="pet-info">

                      <div className="pet-main-info">

                        <h3>
                          {pet.name}
                        </h3>


                        <p>

                          {
                            pet.animal_type
                          }

                          {" "}

                          •

                          {" "}

                          {
                            pet.age
                          }

                          {" "}

                          {pet.age === 1
                            ? "year"
                            : "years"}

                        </p>

                      </div>


                      {user && (

                        <button
                          className="favorite-button"
                          onClick={() =>
                            toggleFavorite(
                              pet.id,
                            )
                          }
                          aria-label="Favorite pet"
                        >

                          {favorites.includes(
                            pet.id,
                          )
                            ? "❤️"
                            : "♡"}

                        </button>

                      )}


                      <div className="pet-card-actions">

                        <button
                          className="view-button"
                          onClick={() =>
                            setSelectedPet(
                              pet,
                            )
                          }
                        >
                          View Details
                        </button>


                        <button
                          className="share-button"
                          onClick={() =>
                            sharePet(
                              pet,
                            )
                          }
                        >
                          Share
                        </button>

                      </div>


                      {pet.available_for_adoption &&
                        user &&
                        !isOwner && (

                          <button
                            className="adopt-button"
                            onClick={() =>
                              openAdoptionRequest(
                                pet,
                              )
                            }
                          >

                            {pendingRequest
                              ? "Request Pending"
                              : "Request Adoption"}

                          </button>

                        )}

                    </div>

                  </div>

                );

              },
            )}

          </div>

        )}

      </section>


      {/* FAVORITES */}

      {user && (

        <section
          className="pets-section"
          id="favorites"
        >

          <div className="section-heading">

            <h2>
              My Favorites
            </h2>

          </div>


          {favoritePets.length === 0 ? (

            <div className="empty-state">

              <span>
                ♡
              </span>


              <h3>
                No favorites yet
              </h3>


              <p>
                Save pets you love
                and find them here
                anytime.
              </p>


              <a
                href="#pets"
                className="cta-button"
              >
                Find a Pet
              </a>

            </div>

          ) : (

            <div className="pet-grid">

              {favoritePets.map(
                (pet) => (

                  <div
                    className="pet-card"
                    key={pet.id}
                  >

                    <div className="pet-image-wrapper">

                      <img
                        src={
                          getPetImage(
                            pet,
                          )
                        }
                        alt={
                          pet.name
                        }
                      />

                    </div>


                    <div className="pet-info">

                      <div className="pet-main-info">

                        <h3>
                          {pet.name}
                        </h3>


                        <p>

                          {
                            pet.animal_type
                          }

                          {" "}

                          •

                          {" "}

                          {
                            pet.age
                          }

                          {" "}

                          {pet.age === 1
                            ? "year"
                            : "years"}

                        </p>

                      </div>


                      <button
                        className="favorite-button"
                        onClick={() =>
                          toggleFavorite(
                            pet.id,
                          )
                        }
                        aria-label="Remove from favorites"
                      >
                        ❤️
                      </button>


                      <div className="pet-card-actions">

                        <button
                          className="view-button"
                          onClick={() =>
                            setSelectedPet(
                              pet,
                            )
                          }
                        >
                          View Details
                        </button>


                        <button
                          className="share-button"
                          onClick={() =>
                            sharePet(
                              pet,
                            )
                          }
                        >
                          Share
                        </button>

                      </div>

                    </div>

                  </div>

                ),
              )}

            </div>

          )}

        </section>

      )}


      {/* MY PETS */}

      {user && (

        <section
          className="pets-section"
          id="my-pets"
        >

          <div className="section-heading">

            <h2>
              My Pets
            </h2>

          </div>


          {myPets.length === 0 ? (

            <div className="empty-state">

              <span>
                🐾
              </span>


              <h3>
                You haven't added
                any pets yet
              </h3>


              <p>
                Add a pet to start
                receiving adoption
                requests.
              </p>


              <button
                className="cta-button"
                onClick={() => {

                  setShowAddForm(
                    true,
                  );


                  setTimeout(() => {

                    document
                      .getElementById(
                        "add-pet-form",
                      )
                      ?.scrollIntoView({

                        behavior:
                          "smooth",

                      });

                  }, 50);

                }}
              >
                Add a Pet
              </button>

            </div>

          ) : (

            <div className="pet-grid">

              {myPets.map(
                (pet) => (

                  <div
                    className="pet-card"
                    key={pet.id}
                  >

                    <div className="pet-image-wrapper">

                      <img
                        src={
                          getPetImage(
                            pet,
                          )
                        }
                        alt={
                          pet.name
                        }
                      />


                      <span className="available-badge">

                        {pet.available_for_adoption
                          ? "Available"
                          : "Adopted"}

                      </span>

                    </div>


                    <div className="pet-info">

                      <div className="pet-main-info">

                        <h3>
                          {pet.name}
                        </h3>


                        <p>

                          {
                            pet.animal_type
                          }

                          {" "}

                          •

                          {" "}

                          {
                            pet.age
                          }

                          {" "}

                          {pet.age === 1
                            ? "year"
                            : "years"}

                        </p>

                      </div>


                      <div className="pet-card-actions">

                        <button
                          className="view-button"
                          onClick={() =>
                            setSelectedPet(
                              pet,
                            )
                          }
                        >
                          View
                        </button>


                        {pet.available_for_adoption && (

                          <>

                            <button
                              className="edit-button"
                              onClick={() =>
                                startEditing(
                                  pet,
                                )
                              }
                            >
                              Edit
                            </button>


                            <button
                              className="delete-button"
                              onClick={() =>
                                deletePet(
                                  pet.id,
                                )
                              }
                            >
                              Delete
                            </button>

                          </>

                        )}

                      </div>

                    </div>

                  </div>

                ),
              )}

            </div>

          )}

        </section>

      )}


      {/* CTA */}

      {user && (

        <section className="cta-section">

          <div>

            <p className="eyebrow">
              HELP A PET FIND HOME
            </p>


            <h2>
              Have a pet looking
              for a family?
            </h2>


            <p>
              Create a listing and
              connect directly with
              potential adopters.
            </p>

          </div>


          <button
            className="cta-button"
            onClick={() => {

              setShowAddForm(
                true,
              );


              setTimeout(() => {

                document
                  .getElementById(
                    "add-pet-form",
                  )
                  ?.scrollIntoView({

                    behavior:
                      "smooth",

                  });

              }, 50);

            }}
          >
            Add a Pet
          </button>

        </section>

      )}


      {/* ADD PET */}

      {user &&
        showAddForm && (

          <section
            className="add-form"
            id="add-pet-form"
          >

            <h2>
              Add a Pet
            </h2>


            <form
              onSubmit={
                handleAddPet
              }
            >

              <label>

                Pet Name


                <input
                  required
                  value={
                    petForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setPetForm({

                      ...petForm,

                      name:
                        event.target
                          .value,

                    })
                  }
                />

              </label>


              <label>

                Animal Type


                <select
                  value={
                    petForm.animal_type
                  }
                  onChange={(
                    event,
                  ) =>
                    setPetForm({

                      ...petForm,

                      animal_type:
                        event.target
                          .value,

                    })
                  }
                >

                  <option value="Dog">
                    Dog
                  </option>


                  <option value="Cat">
                    Cat
                  </option>

                </select>

              </label>


              <label>

                Age


                <input
                  required
                  type="number"
                  min="0"
                  value={
                    petForm.age
                  }
                  onChange={(
                    event,
                  ) =>
                    setPetForm({

                      ...petForm,

                      age:
                        event.target
                          .value,

                    })
                  }
                />

              </label>


              <label className="checkbox-label">

                <input
                  type="checkbox"
                  checked={
                    petForm.available_for_adoption
                  }
                  onChange={(
                    event,
                  ) =>
                    setPetForm({

                      ...petForm,

                      available_for_adoption:
                        event.target
                          .checked,

                    })
                  }
                />


                Available for adoption

              </label>


              <button
                className="cta-button"
                type="submit"
              >
                Add Pet
              </button>

            </form>

          </section>

        )}


      {/* AUTH */}

      {showAuth && (

        <div className="pet-details">

          <div className="pet-details-content">

            <button
              className="close-details"
              onClick={() =>
                setShowAuth(
                  false,
                )
              }
              aria-label="Close"
            >
              ×
            </button>


            <p className="eyebrow">
              PAWCONNECT
            </p>


            <h2>

              {authMode ===
              "login"
                ? "Welcome back"
                : "Create an account"}

            </h2>


            <p className="details-description">

              {authMode ===
              "login"
                ? "Log in to manage your pets, favorites and adoption requests."
                : "Create your PawConnect account to list pets and connect with adopters."}

            </p>


            {authMessage && (

              <p
                style={{

                  padding:
                    "12px 14px",

                  borderRadius:
                    "10px",

                  background:
                    "#edf7ed",

                  color:
                    "#2d6a3f",

                  marginBottom:
                    "15px",

                }}
              >

                {authMessage}

              </p>

            )}


            {authError && (

              <p
                style={{

                  padding:
                    "12px 14px",

                  borderRadius:
                    "10px",

                  background:
                    "#fff0ee",

                  color:
                    "#a33a2b",

                  marginBottom:
                    "15px",

                }}
              >

                {authError}

              </p>

            )}


            <form
              className="auth-form"
              onSubmit={
                handleAuthSubmit
              }
            >

              {authMode ===
                "register" && (

                <>

                  <label>

                    Name


                    <input
                      required
                      minLength="2"
                      value={
                        authForm.name
                      }
                      onChange={(
                        event,
                      ) =>
                        setAuthForm({

                          ...authForm,

                          name:
                            event
                              .target
                              .value,

                        })
                      }
                    />

                  </label>


                  <label>

                    Phone


                    <input
                      type="tel"
                      value={
                        authForm.phone
                      }
                      onChange={(
                        event,
                      ) =>
                        setAuthForm({

                          ...authForm,

                          phone:
                            event
                              .target
                              .value,

                        })
                      }
                    />

                  </label>

                </>

              )}


              <label>

                Email


                <input
                  required
                  type="email"
                  value={
                    authForm.email
                  }
                  onChange={(
                    event,
                  ) =>
                    setAuthForm({

                      ...authForm,

                      email:
                        event.target
                          .value,

                    })
                  }
                />

              </label>


              <label>

                Password


                <input
                  required
                  minLength="8"
                  type="password"
                  value={
                    authForm.password
                  }
                  onChange={(
                    event,
                  ) =>
                    setAuthForm({

                      ...authForm,

                      password:
                        event.target
                          .value,

                    })
                  }
                />

              </label>


              <button
                className="cta-button"
                type="submit"
                disabled={
                  authLoading
                }
              >

                {authLoading
                  ? "Please wait..."
                  : authMode ===
                    "login"
                  ? "Log in"
                  : "Create Account"}

              </button>

            </form>


            {authMode ===
              "login" && (

              <>

                <button
                  type="button"
                  onClick={
                    handleGoogleLogin
                  }
                  disabled={
                    authLoading
                  }
                  style={{

                    width:
                      "100%",

                    marginTop:
                      "12px",

                    padding:
                      "13px 16px",

                    border:
                      "1px solid #deded7",

                    borderRadius:
                      "10px",

                    background:
                      "#ffffff",

                    cursor:
                      authLoading
                        ? "default"
                        : "pointer",

                    fontWeight:
                      "600",

                    fontSize:
                      "15px",

                  }}
                >

                  {authLoading
                    ? "Connecting..."
                    : "Continue with Google"}

                </button>


                <button
                  type="button"
                  className="auth-switch"
                  onClick={() => {

                    setShowForgotPassword(
                      true,
                    );

                    setForgotEmail(
                      authForm.email,
                    );

                    setAuthError(
                      "",
                    );

                    setAuthMessage(
                      "",
                    );

                  }}
                >
                  Forgot password?
                </button>

              </>

            )}


            <button
              className="auth-switch"
              onClick={() => {

                setAuthMode(

                  authMode ===
                  "login"
                    ? "register"
                    : "login",

                );


                setAuthError(
                  "",
                );

                setAuthMessage(
                  "",
                );

              }}
            >

              {authMode ===
              "login"
                ? "Don't have an account? Register"
                : "Already have an account? Log in"}

            </button>

          </div>

        </div>

      )}


      {/* FORGOT PASSWORD */}

      {showForgotPassword && (

        <div className="pet-details">

          <div className="pet-details-content">

            <button
              className="close-details"
              onClick={() =>
                setShowForgotPassword(
                  false,
                )
              }
              aria-label="Close"
            >
              ×
            </button>


            <p className="eyebrow">
              PAWCONNECT
            </p>


            <h2>
              Reset your password
            </h2>


            <p className="details-description">

              Enter your email and
              we'll send you a
              password reset link.

            </p>


            {authMessage && (

              <p
                style={{

                  padding:
                    "12px 14px",

                  borderRadius:
                    "10px",

                  background:
                    "#edf7ed",

                  color:
                    "#2d6a3f",

                  marginBottom:
                    "15px",

                }}
              >

                {authMessage}

              </p>

            )}


            {authError && (

              <p
                style={{

                  padding:
                    "12px 14px",

                  borderRadius:
                    "10px",

                  background:
                    "#fff0ee",

                  color:
                    "#a33a2b",

                  marginBottom:
                    "15px",

                }}
              >

                {authError}

              </p>

            )}


            <form
              className="auth-form"
              onSubmit={
                handleForgotPassword
              }
            >

              <label>

                Email


                <input
                  required
                  type="email"
                  value={
                    forgotEmail
                  }
                  onChange={(
                    event,
                  ) => {

                    setForgotEmail(
                      event.target
                        .value,
                    );

                    setAuthError(
                      "",
                    );

                  }}
                />

              </label>


              <button
                className="cta-button"
                type="submit"
                disabled={
                  forgotLoading
                }
              >

                {forgotLoading
                  ? "Sending..."
                  : "Send Reset Link"}

              </button>

            </form>


            <button
              className="auth-switch"
              onClick={() => {

                setShowForgotPassword(
                  false,
                );

                setShowAuth(
                  true,
                );

                setAuthMode(
                  "login",
                );

                setAuthError(
                  "",
                );

                setAuthMessage(
                  "",
                );

              }}
            >
              Back to login
            </button>

          </div>

        </div>

      )}


      {/* RESET PASSWORD */}

      {showResetPassword && (

        <div className="pet-details">

          <div className="pet-details-content">

            <p className="eyebrow">
              PAWCONNECT
            </p>


            <h2>
              Choose a new password
            </h2>


            <p className="details-description">

              Enter your new
              password below.

            </p>


            {authMessage && (

              <p
                style={{

                  padding:
                    "12px 14px",

                  borderRadius:
                    "10px",

                  background:
                    "#edf7ed",

                  color:
                    "#2d6a3f",

                  marginBottom:
                    "15px",

                }}
              >

                {authMessage}

              </p>

            )}


            {authError && (

              <p
                style={{

                  padding:
                    "12px 14px",

                  borderRadius:
                    "10px",

                  background:
                    "#fff0ee",

                  color:
                    "#a33a2b",

                  marginBottom:
                    "15px",

                }}
              >

                {authError}

              </p>

            )}


            <form
              className="auth-form"
              onSubmit={
                handleResetPassword
              }
            >

              <label>

                New Password


                <input
                  required
                  minLength="8"
                  type="password"
                  value={
                    newPassword
                  }
                  onChange={(
                    event,
                  ) => {

                    setNewPassword(
                      event.target
                        .value,
                    );

                    setAuthError(
                      "",
                    );

                  }}
                />

              </label>


              <label>

                Confirm Password


                <input
                  required
                  minLength="8"
                  type="password"
                  value={
                    confirmNewPassword
                  }
                  onChange={(
                    event,
                  ) => {

                    setConfirmNewPassword(
                      event.target
                        .value,
                    );

                    setAuthError(
                      "",
                    );

                  }}
                />

              </label>


              <button
                className="cta-button"
                type="submit"
                disabled={
                  resetLoading
                }
              >

                {resetLoading
                  ? "Updating..."
                  : "Update Password"}

              </button>

            </form>

          </div>

        </div>

      )}


      {/* DELETE ACCOUNT MODAL */}

      {showDeleteAccount && (

        <div className="pet-details">

          <div className="pet-details-content">

            <button
              className="close-details"
              onClick={() =>
                setShowDeleteAccount(
                  false,
                )
              }
              aria-label="Close"
              disabled={
                deleteLoading
              }
            >
              ×
            </button>


            <p className="eyebrow">
              ACCOUNT SETTINGS
            </p>


            <h2>
              Delete your account?
            </h2>


            <p className="details-description">

              This will permanently
              delete your PawConnect
              account and associated
              account data.

            </p>


            <p className="details-description">

              This action cannot be
              undone.

            </p>


            <div className="details-actions">

              <button
                className="delete-button"
                onClick={
                  handleDeleteAccount
                }
                disabled={
                  deleteLoading
                }
              >

                {deleteLoading
                  ? "Deleting..."
                  : "Yes, Delete Account"}

              </button>


              <button
                className="share-button"
                onClick={() =>
                  setShowDeleteAccount(
                    false,
                  )
                }
                disabled={
                  deleteLoading
                }
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ADOPTION REQUEST MODAL */}

      {requestPet && (

        <div className="pet-details">

          <div className="pet-details-content">

            <button
              className="close-details"
              onClick={() =>
                setRequestPet(
                  null,
                )
              }
              aria-label="Close"
            >
              ×
            </button>


            <p className="eyebrow">
              ADOPTION REQUEST
            </p>


            <h2>

              Request{" "}

              {requestPet.name}

            </h2>


            <p className="details-description">

              Your request will be
              sent to the owner. They
              can review your contact
              details, contact you
              directly, and then
              accept or reject the
              request.

            </p>


            <form
              className="auth-form"
              onSubmit={
                submitAdoptionRequest
              }
            >

              <label>

                Message to the owner


                <textarea
                  rows="6"
                  value={
                    requestMessage
                  }
                  onChange={(
                    event,
                  ) =>
                    setRequestMessage(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Tell the owner a little about yourself and why you would like to adopt this pet..."
                  style={{

                    width:
                      "100%",

                    padding:
                      "13px 14px",

                    border:
                      "1px solid #deded7",

                    borderRadius:
                      "10px",

                    outline:
                      "none",

                    background:
                      "#fafaf7",

                    resize:
                      "vertical",

                  }}
                />

              </label>


              <button
                className="cta-button"
                type="submit"
              >
                Send Adoption Request
              </button>

            </form>

          </div>

        </div>

      )}


      {/* REQUESTS MODAL */}

      {showRequests &&
        user && (

          <div className="pet-details">

            <div
              className="pet-details-content"
              style={{

                width:
                  "min(900px, 100%)",

              }}
            >

              <button
                className="close-details"
                onClick={() =>
                  setShowRequests(
                    false,
                  )
                }
                aria-label="Close"
              >
                ×
              </button>


              <p className="eyebrow">
                ADOPTION REQUESTS
              </p>


              <h2>
                Requests
              </h2>


              <h3
                style={{

                  marginTop:
                    "30px",

                }}
              >
                Received for my pets
              </h3>


              {receivedRequests.length ===
              0 ? (

                <p className="details-description">

                  No adoption
                  requests yet.

                </p>

              ) : (

                receivedRequests.map(
                  (request) => (

                    <div
                      key={
                        request.id
                      }
                      style={{

                        padding:
                          "18px 0",

                        borderBottom:
                          "1px solid #e7e6df",

                      }}
                    >

                      <strong>

                        {
                          request.pet_name
                        }

                      </strong>


                      <p>

                        Request from{" "}

                        <strong>

                          {
                            request.requester_name
                          }

                        </strong>

                      </p>


                      <p>

                        Email:{" "}

                        {
                          request.requester_email
                        }

                      </p>


                      {request.requester_phone && (

                        <p>

                          Phone:{" "}

                          {
                            request.requester_phone
                          }

                        </p>

                      )}


                      {request.message && (

                        <p>

                          Message:{" "}

                          {
                            request.message
                          }

                        </p>

                      )}


                      <p>

                        Status:{" "}

                        <strong>

                          {
                            request.status
                          }

                        </strong>

                      </p>


                      {request.status ===
                        "Pending" && (

                        <div className="details-actions">

                          <button
                            className="adopt-button"
                            onClick={() =>
                              decideRequest(
                                request.id,
                                "accepted",
                              )
                            }
                          >
                            Accept
                          </button>


                          <button
                            className="delete-button"
                            onClick={() =>
                              decideRequest(
                                request.id,
                                "rejected",
                              )
                            }
                          >
                            Reject
                          </button>

                        </div>

                      )}

                    </div>

                  ),
                )

              )}


              <h3
                style={{

                  marginTop:
                    "35px",

                }}
              >
                My requests
              </h3>


              {myRequests.length ===
              0 ? (

                <p className="details-description">

                  You haven't sent
                  any adoption
                  requests.

                </p>

              ) : (

                myRequests.map(
                  (request) => (

                    <div
                      key={
                        request.id
                      }
                      style={{

                        padding:
                          "18px 0",

                        borderBottom:
                          "1px solid #e7e6df",

                      }}
                    >

                      <strong>

                        {
                          request.pet_name
                        }

                      </strong>


                      <p>

                        Status:{" "}

                        <strong>

                          {
                            request.status
                          }

                        </strong>

                      </p>


                      {request.status ===
                        "Accepted" && (

                        <p>

                          Your adoption
                          request was
                          accepted.

                        </p>

                      )}

                    </div>

                  ),
                )

              )}

            </div>

          </div>

        )}


      {/* PET DETAILS */}

      {selectedPet && (

        <div className="pet-details">

          <div className="pet-details-image">

            <img
              src={
                getPetImage(
                  selectedPet,
                )
              }
              alt={
                selectedPet.name
              }
            />

          </div>


          <div className="pet-details-content">

            <button
              className="close-details"
              onClick={() =>
                setSelectedPet(
                  null,
                )
              }
              aria-label="Close"
            >
              ×
            </button>


            <h2>
              {selectedPet.name}
            </h2>


            <p className="details-type">

              {
                selectedPet.animal_type
              }

              {" "}

              •

              {" "}

              {
                selectedPet.age
              }

              {" "}

              {selectedPet.age === 1
                ? "year"
                : "years"}

            </p>


            <span className="details-status">

              {selectedPet.available_for_adoption
                ? "Available for adoption"
                : "Already adopted"}

            </span>


            <p className="details-description">

              This pet is listed
              on PawConnect by its
              owner. Interested
              adopters can send an
              adoption request
              directly to the owner.

            </p>


            <div className="details-actions">

              {selectedPet.available_for_adoption &&
                user &&
                selectedPet.owner_id !==
                  user.id && (

                  <button
                    className="adopt-button"
                    onClick={() => {

                      setSelectedPet(
                        null,
                      );


                      openAdoptionRequest(
                        selectedPet,
                      );

                    }}
                  >
                    Request Adoption
                  </button>

                )}


              <button
                className="share-button"
                onClick={() =>
                  sharePet(
                    selectedPet,
                  )
                }
              >
                Share
              </button>


              {user?.id ===
                selectedPet.owner_id &&
                selectedPet.available_for_adoption && (

                  <>

                    <button
                      className="edit-button"
                      onClick={() =>
                        startEditing(
                          selectedPet,
                        )
                      }
                    >
                      Edit
                    </button>


                    <button
                      className="delete-button"
                      onClick={() =>
                        deletePet(
                          selectedPet.id,
                        )
                      }
                    >
                      Delete
                    </button>

                  </>

                )}

            </div>

          </div>

        </div>

      )}


      {/* EDIT PET */}

      {editingPet && (

        <div className="pet-details">

          <div className="pet-details-content">

            <button
              className="close-details"
              onClick={() =>
                setEditingPet(
                  null,
                )
              }
              aria-label="Close"
            >
              ×
            </button>


            <form
              className="edit-form"
              onSubmit={
                handleEditPet
              }
            >

              <h2>
                Edit Pet
              </h2>


              <label>

                Pet Name


                <input
                  required
                  value={
                    editingPet.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditingPet({

                      ...editingPet,

                      name:
                        event.target
                          .value,

                    })
                  }
                />

              </label>


              <label>

                Animal Type


                <select
                  value={
                    editingPet.animal_type
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditingPet({

                      ...editingPet,

                      animal_type:
                        event.target
                          .value,

                    })
                  }
                >

                  <option value="Dog">
                    Dog
                  </option>


                  <option value="Cat">
                    Cat
                  </option>

                </select>

              </label>


              <label>

                Age


                <input
                  required
                  min="0"
                  type="number"
                  value={
                    editingPet.age
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditingPet({

                      ...editingPet,

                      age:
                        event.target
                          .value,

                    })
                  }
                />

              </label>


              <label className="edit-checkbox">

                <input
                  type="checkbox"
                  checked={
                    editingPet.available_for_adoption
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditingPet({

                      ...editingPet,

                      available_for_adoption:
                        event.target
                          .checked,

                    })
                  }
                />


                <span>
                  Available for adoption
                </span>

              </label>


              <button
                className="cta-button"
                type="submit"
              >
                Save Changes
              </button>

            </form>

          </div>

        </div>

      )}


      {/* FOOTER */}

      <footer>

        <div className="logo">

          <span className="logo-icon">
            🐾
          </span>

          PawConnect

        </div>


        <span>
          © 2026 PawConnect
        </span>

      </footer>

    </div>

  );

}


export default App;