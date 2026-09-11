import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [filter, setFilter] = useState("All");
  const [selectedPet, setSelectedPet] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editPet, setEditPet] = useState(null);

  const [newPet, setNewPet] = useState({
    name: "",
    animal_type: "Dog",
    age: "",
    available_for_adoption: true,
  });

  const [pets, setPets] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("https://pet-adoption-system-p7pu.onrender.com/pets")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch pets");
        }
        return response.json();
      })
      .then((data) => {
        setPets(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setError("Unable to load pets");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const restoreUser = async () => {
      const savedToken = localStorage.getItem("token");

      if (!savedToken) {
        return;
      }

      try {
        const response = await fetch(
          "https://pet-adoption-system-p7pu.onrender.com/me",
          {
            headers: {
              Authorization: `Bearer ${savedToken}`,
            },
          },
        );

        if (!response.ok) {
          localStorage.removeItem("token");
          setToken(null);
          return;
        }

        const userData = await response.json();

        setToken(savedToken);
        setUser(userData);
      } catch (error) {
        console.error("Failed to restore user:", error);
        localStorage.removeItem("token");
        setToken(null);
      }
    };

    restoreUser();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!token) {
        setFavorites([]);
        return;
      }

      try {
        const response = await fetch(
          "https://pet-adoption-system-p7pu.onrender.com/favorites",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          setFavorites([]);
          return;
        }

        const data = await response.json();

        setFavorites(data.map((favorite) => favorite.pet_id));
      } catch (error) {
        console.error("Failed to load favorites:", error);
        setFavorites([]);
      }
    };

    loadFavorites();
  }, [token]);

  const getPetImage = (pet) => {
    if (pet.animal_type === "Dog") {
      return "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800";
    }

    if (pet.animal_type === "Cat") {
      return "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800";
    }

    return "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800";
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    try {
      if (authMode === "register") {
        const registerResponse = await fetch(
          "https://pet-adoption-system-p7pu.onrender.com/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
              phone: authForm.phone,
            }),
          },
        );

        if (!registerResponse.ok) {
          const data = await registerResponse.json();
          throw new Error(data.detail || "Registration failed");
        }

        alert("Registration successful! Please log in. 🐾");

        setAuthMode("login");
        setAuthForm({
          name: "",
          email: authForm.email,
          password: "",
          phone: "",
        });

        return;
      }

      const loginResponse = await fetch(
        "https://pet-adoption-system-p7pu.onrender.com/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password,
          }),
        },
      );

      if (!loginResponse.ok) {
        const data = await loginResponse.json();
        throw new Error(data.detail || "Login failed");
      }

      const loginData = await loginResponse.json();

      localStorage.setItem("token", loginData.access_token);
      setToken(loginData.access_token);

      const meResponse = await fetch(
        "https://pet-adoption-system-p7pu.onrender.com/me",
        {
          headers: {
            Authorization: `Bearer ${loginData.access_token}`,
          },
        },
      );

      if (!meResponse.ok) {
        throw new Error("Unable to get user details");
      }

      const userData = await meResponse.json();
      setUser(userData);

      setAuthForm({
        name: "",
        email: "",
        password: "",
        phone: "",
      });

      alert(`Welcome to PawConnect, ${userData.name}! 🐾`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Something went wrong");
    }
  };

  const filteredPets = pets.filter((pet) => {
    const matchesSearch = pet.name.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "All" || pet.animal_type === filter;

    return matchesSearch && matchesFilter;
  });

  const favoritePets = pets.filter((pet) => favorites.includes(pet.id));

  const handleAddPet = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "https://pet-adoption-system-p7pu.onrender.com/pets",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...newPet,
            age: Number(newPet.age),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to add pet");
      }

      const addedPet = await response.json();

      setPets([...pets, addedPet]);

      setNewPet({
        name: "",
        animal_type: "Dog",
        age: "",
        available_for_adoption: true,
      });

      setShowAddForm(false);

      alert("Pet added successfully! 🐾");
    } catch (error) {
      console.error(error);
      alert("Unable to add pet");
    }
  };

  const handleUpdatePet = async () => {
    try {
      const response = await fetch(
        `https://pet-adoption-system-p7pu.onrender.com/pets/${editPet.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editPet.name,
            animal_type: editPet.animal_type,
            age: Number(editPet.age),
            available_for_adoption: editPet.available_for_adoption,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update pet");
      }

      const updatedPet = await response.json();

      setPets(pets.map((pet) => (pet.id === updatedPet.id ? updatedPet : pet)));

      setEditPet(null);

      alert("Pet updated successfully! 🐾");
    } catch (error) {
      console.error(error);
      alert("Unable to update pet");
    }
  };

  const handleDeletePet = async (petId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this pet?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `https://pet-adoption-system-p7pu.onrender.com/pets/${petId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete pet");
      }

      setPets(pets.filter((pet) => pet.id !== petId));

      if (selectedPet?.id === petId) {
        setSelectedPet(null);
      }

      alert("Pet deleted successfully! 🐾");
    } catch (error) {
      console.error(error);
      alert("Unable to delete pet");
    }
  };

  const handleAdoptPet = async (petId) => {
    if (!user) {
      alert("Please log in to adopt a pet.");
      return;
    }

    try {
      const response = await fetch(
        `https://pet-adoption-system-p7pu.onrender.com/pets/${petId}/adopt`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to adopt pet");
      }

      const adoptedPet = await response.json();

      setPets(pets.map((pet) => (pet.id === adoptedPet.id ? adoptedPet : pet)));

      if (selectedPet?.id === adoptedPet.id) {
        setSelectedPet(adoptedPet);
      }

      alert("Pet adopted successfully! 🐾❤️");
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to adopt pet");
    }
  };

  const handleFavorite = async (petId) => {
    if (!user) {
      alert("Please log in to add favorites.");
      return;
    }

    const isFavorite = favorites.includes(petId);

    try {
      const response = await fetch(
        `https://pet-adoption-system-p7pu.onrender.com/favorites/${petId}`,
        {
          method: isFavorite ? "DELETE" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update favorite");
      }

      if (isFavorite) {
        setFavorites(favorites.filter((id) => id !== petId));
      } else {
        setFavorites([...favorites, petId]);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to update favorite");
    }
  };

  const handleSharePet = async (pet) => {
    const shareUrl = `${window.location.origin}/?pet=${pet.id}`;

    const shareData = {
      title: `Meet ${pet.name} 🐾`,
      text: `${pet.name} is a ${pet.age}-year-old ${pet.animal_type} looking for a loving home!`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Pet link copied to clipboard! 🔗");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Failed to share pet:", error);
        alert("Unable to share this pet.");
      }
    }
  };

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🐾</span>
          <span>PawConnect</span>
        </div>

        <div className="nav-links">
          <a href="#home" onClick={() => setShowFavorites(false)}>
            Home
          </a>

          <a href="#pets" onClick={() => setShowFavorites(false)}>
            Find a Pet
          </a>

          {user && (
            <a
              href="#pets"
              onClick={() => {
                setShowFavorites(true);

                setTimeout(() => {
                  document
                    .getElementById("pets")
                    ?.scrollIntoView({ behavior: "smooth" });
                }, 0);
              }}
            >
              ❤️ Favorites
            </a>
          )}

          <a
            href="#add"
            onClick={(e) => {
              e.preventDefault();

              if (!user) {
                alert("Please log in to add a pet.");
                document.getElementById("auth")?.scrollIntoView({
                  behavior: "smooth",
                });
                return;
              }

              setShowFavorites(false);
              setShowAddForm(true);

              setTimeout(() => {
                document.getElementById("add-form")?.scrollIntoView({
                  behavior: "smooth",
                });
              }, 50);
            }}
          >
            Add Pet
          </a>

          <a href="#about">About</a>
        </div>

        {user ? (
          <div className="user-menu">
            <span>Hi, {user.name} 👋</span>

            <button
              className="nav-button"
              onClick={() => {
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
                setFavorites([]);
                setShowFavorites(false);
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            className="nav-button"
            onClick={() => {
              document
                .getElementById("auth")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Get Started
          </button>
        )}
      </nav>

      {/* Hero */}
      <section className="hero-section" id="home">
        <div className="hero-content">
          <p className="eyebrow">🐾 FIND YOUR NEW BEST FRIEND</p>

          <h1>
            Every pet deserves
            <br />
            <span>a loving home.</span>
          </h1>

          <p className="hero-text">
            Discover pets waiting for a second chance at happiness. Find a
            companion who is ready to become part of your family.
          </p>

          <div className="search-box">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search by pet name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="hero-decoration">
          <div className="hero-circle"></div>
          <div className="hero-paw">🐾</div>
        </div>
      </section>

      {/* Authentication */}
      <section className="auth-section" id="auth">
        {user ? (
          <>
            <p className="eyebrow">WELCOME BACK</p>
            <h2>Hi, {user.name}! 🐾</h2>
            <p>You are logged in and can now add pets and adopt pets.</p>
          </>
        ) : (
          <>
            <p className="eyebrow">
              {authMode === "login" ? "WELCOME BACK" : "JOIN PAWCONNECT"}
            </p>

            <h2>
              {authMode === "login"
                ? "Log in to PawConnect"
                : "Create your account"}
            </h2>

            <p>
              {authMode === "login"
                ? "Log in to add and adopt pets."
                : "Create one account to add pets and adopt pets."}
            </p>

            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === "register" && (
                <>
                  <label>
                    Full Name
                    <input
                      type="text"
                      value={authForm.name}
                      onChange={(e) =>
                        setAuthForm({
                          ...authForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Enter your name"
                      required
                    />
                  </label>

                  <label>
                    Phone
                    <input
                      type="tel"
                      value={authForm.phone}
                      onChange={(e) =>
                        setAuthForm({
                          ...authForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="Enter your phone number"
                    />
                  </label>
                </>
              )}

              <label>
                Email
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="Enter your email"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter your password"
                  minLength="6"
                  required
                />
              </label>

              <button type="submit" className="cta-button">
                {authMode === "login" ? "Login" : "Register"}
              </button>
            </form>

            <button
              type="button"
              className="auth-switch"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthForm({
                  name: "",
                  email: authForm.email,
                  password: "",
                  phone: "",
                });
              }}
            >
              {authMode === "login"
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </button>
          </>
        )}
      </section>

      {/* Pets */}
      <section
        className="pets-section"
        id={showFavorites ? "favorites" : "pets"}
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {showFavorites ? "YOUR FAVORITES" : "MEET YOUR MATCH"}
            </p>

            <h2>
              {showFavorites ? "Pets you've saved" : "Pets looking for a home"}
            </h2>
          </div>

          {!showFavorites && (
            <div className="filters">
              {["All", "Dog", "Cat"].map((type) => (
                <button
                  key={type}
                  className={filter === type ? "active" : ""}
                  onClick={() => setFilter(type)}
                >
                  {type === "All" ? "All Pets" : `${type}s`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pet-grid">
          {(showFavorites ? favoritePets : filteredPets).map((pet) => (
            <article className="pet-card" key={pet.id}>
              <div className="pet-image-wrapper">
                <img src={getPetImage(pet)} alt={pet.name} />

                {pet.available_for_adoption && (
                  <span className="available-badge">Available</span>
                )}
              </div>

              <div className="pet-info">
                <div>
                  <h3>{pet.name}</h3>
                  <p>
                    {pet.animal_type} · {pet.age}{" "}
                    {pet.age === 1 ? "year" : "years"} old
                  </p>
                </div>

                {user && pet.owner_id !== user.id && (
                  <button
                    className="favorite-button"
                    onClick={() => handleFavorite(pet.id)}
                    title={
                      favorites.includes(pet.id)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    {favorites.includes(pet.id) ? "❤️" : "♡"}
                  </button>
                )}

                <div className="pet-card-actions">
                  <button
                    className="view-button"
                    onClick={() => setSelectedPet(pet)}
                  >
                    View Details →
                  </button>

                  {user &&
                    pet.available_for_adoption &&
                    pet.owner_id !== user.id && (
                      <button
                        className="adopt-button"
                        onClick={() => handleAdoptPet(pet.id)}
                      >
                        Adopt ❤️
                      </button>
                    )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {(showFavorites ? favoritePets : filteredPets).length === 0 && (
          <div className="empty-state">
            <span>{showFavorites ? "❤️" : "🐾"}</span>

            <h3>{showFavorites ? "No favorite pets yet" : "No pets found"}</h3>

            <p>
              {showFavorites
                ? "Tap the heart on a pet to save it here."
                : "Try searching for another name."}
            </p>

            {showFavorites && (
              <button
                className="cta-button"
                onClick={() => setShowFavorites(false)}
              >
                Find a Pet
              </button>
            )}
          </div>
        )}
        {selectedPet && (
          <div className="pet-details">
            <div className="pet-details-image">
              <img src={getPetImage(selectedPet)} alt={selectedPet.name} />
            </div>

            <div className="pet-details-content">
              <button
                className="close-details"
                onClick={() => setSelectedPet(null)}
              >
                ×
              </button>

              <p className="eyebrow">PET DETAILS</p>

              <h2>{selectedPet.name}</h2>

              <p className="details-type">
                {selectedPet.animal_type} · {selectedPet.age}{" "}
                {selectedPet.age === 1 ? "year" : "years"} old
              </p>

              <span className="details-status">
                {selectedPet.available_for_adoption
                  ? "✓ Available for adoption"
                  : "Currently unavailable"}
              </span>

              <p className="details-description">
                Meet {selectedPet.name}, a lovely{" "}
                {selectedPet.animal_type.toLowerCase()} looking for a caring
                family and a loving home.
              </p>

              <div className="details-actions">
                <button
                  className="share-button"
                  onClick={() => handleSharePet(selectedPet)}
                >
                  Share ↗
                </button>

                {user &&
                  selectedPet.available_for_adoption &&
                  selectedPet.owner_id !== user.id && (
                    <button
                      className="adopt-button"
                      onClick={() => handleAdoptPet(selectedPet.id)}
                    >
                      Adopt {selectedPet.name} ❤️
                    </button>
                  )}

                {user && selectedPet.owner_id === user.id && (
                  <>
                    <button
                      className="edit-button"
                      onClick={() => {
                        setEditPet({ ...selectedPet });
                        setSelectedPet(null);
                      }}
                    >
                      Edit Pet
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => handleDeletePet(selectedPet.id)}
                    >
                      Delete Pet
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {editPet && (
          <div className="pet-details">
            <div className="pet-details-image">
              <img src={getPetImage(editPet)} alt={editPet.name} />
            </div>

            <div className="pet-details-content">
              <button
                className="close-details"
                onClick={() => setEditPet(null)}
              >
                ×
              </button>

              <p className="eyebrow">EDIT PET</p>

              <div className="edit-form">
                <h2>Edit {editPet.name}</h2>

                <input
                  type="text"
                  value={editPet.name}
                  onChange={(e) =>
                    setEditPet({
                      ...editPet,
                      name: e.target.value,
                    })
                  }
                  placeholder="Pet name"
                />

                <select
                  value={editPet.animal_type}
                  onChange={(e) =>
                    setEditPet({
                      ...editPet,
                      animal_type: e.target.value,
                    })
                  }
                >
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                </select>

                <input
                  type="number"
                  min="0"
                  value={editPet.age}
                  onChange={(e) =>
                    setEditPet({
                      ...editPet,
                      age: Number(e.target.value),
                    })
                  }
                  placeholder="Age"
                />

                <label>
                  <input
                    type="checkbox"
                    checked={editPet.available_for_adoption}
                    onChange={(e) =>
                      setEditPet({
                        ...editPet,
                        available_for_adoption: e.target.checked,
                      })
                    }
                  />
                  Available for adoption
                </label>

                <button
                  type="button"
                  className="cta-button"
                  onClick={handleUpdatePet}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Call to action */}
      <section className="cta-section" id="add">
        <div>
          <p className="eyebrow">HELP A PET FIND HOME</p>
          <h2>Have a pet that needs a loving family?</h2>
          <p>Add them to PawConnect and help them find their perfect match.</p>
        </div>

        <button
          className="cta-button"
          onClick={() => {
            if (!user) {
              alert("Please log in to add a pet.");
              return;
            }

            setShowAddForm(!showAddForm);
          }}
        >
          {showAddForm ? "× Close Form" : "+ Add a Pet"}
        </button>
      </section>

      {showAddForm && (
        <form className="add-form" id="add-form" onSubmit={handleAddPet}>
          <h2>Add a Pet</h2>

          <label>
            Pet Name
            <input
              type="text"
              value={newPet.name}
              onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
              placeholder="Enter pet name"
            />
          </label>

          <label>
            Animal Type
            <select
              value={newPet.animal_type}
              onChange={(e) =>
                setNewPet({ ...newPet, animal_type: e.target.value })
              }
            >
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
            </select>
          </label>

          <label>
            Age
            <input
              type="number"
              min="0"
              value={newPet.age}
              onChange={(e) => setNewPet({ ...newPet, age: e.target.value })}
              placeholder="Enter age"
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newPet.available_for_adoption}
              onChange={(e) =>
                setNewPet({
                  ...newPet,
                  available_for_adoption: e.target.checked,
                })
              }
            />
            Available for adoption
          </label>

          <button type="submit" className="cta-button">
            Add Pet
          </button>
        </form>
      )}

      {/* Footer */}
      <footer id="about">
        <div className="logo">
          <span className="logo-icon">🐾</span>
          <span>PawConnect</span>
        </div>

        <p>Connecting pets with the people who will love them.</p>

        <span>© 2026 PawConnect</span>
      </footer>
    </div>
  );
}

export default App;
