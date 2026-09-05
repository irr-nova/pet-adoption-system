import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
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

  const getPetImage = (pet) => {
    if (pet.animal_type === "Dog") {
      return "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800";
    }

    if (pet.animal_type === "Cat") {
      return "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800";
    }

    return "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800";
  };

  const filteredPets = pets.filter((pet) => {
    const matchesSearch = pet.name.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "All" || pet.animal_type === filter;

    return matchesSearch && matchesFilter;
  });

  const handleAddPet = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("https://pet-adoption-system-p7pu.onrender.com/pets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newPet,
          age: Number(newPet.age),
        }),
      });

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
      const response = await fetch(`https://pet-adoption-system-p7pu.onrender.com/pets/${editPet.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editPet.name,
          animal_type: editPet.animal_type,
          age: Number(editPet.age),
          available_for_adoption: editPet.available_for_adoption,
        }),
      });

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
      const response = await fetch(`https://pet-adoption-system-p7pu.onrender.com/pets/${petId}`, {
        method: "DELETE",
      });

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

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🐾</span>
          <span>PawConnect</span>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#pets">Find a Pet</a>
          <a href="#add">Add Pet</a>
          <a href="#about">About</a>
        </div>

        <button className="nav-button">Get Started</button>
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

      {/* Pets */}
      <section className="pets-section" id="pets">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MEET YOUR MATCH</p>
            <h2>Pets looking for a home</h2>
          </div>

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
        </div>

        <div className="pet-grid">
          {filteredPets.map((pet) => (
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

                <button
                  className="view-button"
                  onClick={() => setSelectedPet(pet)}
                >
                  View →
                </button>

                <button
                  className="edit-button"
                  onClick={() => setEditPet({ ...pet })}
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  onClick={() => handleDeletePet(pet.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>

        {filteredPets.length === 0 && (
          <div className="empty-state">
            <span>🐾</span>
            <h3>No pets found</h3>
            <p>Try searching for another name.</p>
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

              {selectedPet.editing ? (
                <div className="edit-form">
                  <h2>Edit {selectedPet.name}</h2>

                  <input
                    type="text"
                    value={selectedPet.name}
                    onChange={(e) =>
                      setSelectedPet({
                        ...selectedPet,
                        name: e.target.value,
                      })
                    }
                    placeholder="Pet name"
                  />

                  <select
                    value={selectedPet.animal_type}
                    onChange={(e) =>
                      setSelectedPet({
                        ...selectedPet,
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
                    value={selectedPet.age}
                    onChange={(e) =>
                      setSelectedPet({
                        ...selectedPet,
                        age: Number(e.target.value),
                      })
                    }
                    placeholder="Age"
                  />

                  <label>
                    <input
                      type="checkbox"
                      checked={selectedPet.available_for_adoption}
                      onChange={(e) =>
                        setSelectedPet({
                          ...selectedPet,
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
              ) : (
                <>
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
                </>
              )}
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
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "× Close Form" : "+ Add a Pet"}
        </button>
      </section>

      {showAddForm && (
        <form className="add-form" onSubmit={handleAddPet}>
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
