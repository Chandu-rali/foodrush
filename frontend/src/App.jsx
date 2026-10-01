import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://15.207.88.255:5000";

const categories = [
  { name: "All", emoji: "🍽️" },
  { name: "Pizza", emoji: "🍕" },
  { name: "Burger", emoji: "🍔" },
  { name: "Biryani", emoji: "🍛" },
  { name: "Chinese", emoji: "🍜" },
  { name: "Dessert", emoji: "🍰" }
];

function App() {
  const [page, setPage] = useState("login");
  const [authMode, setAuthMode] = useState("login");

  const [email, setEmail] = useState("chandu@foodrush.com");
  const [password, setPassword] = useState("FoodRush@123");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  const [foods, setFoods] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [address, setAddress] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("foodrush_token");
    const savedUser = localStorage.getItem("foodrush_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setPage("home");
    }
  }, []);

  useEffect(() => {
    if (page === "home") {
      loadFoods();
    }
  }, [page]);

  const loadFoods = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/foods`);
      setFoods(response.data.foods || []);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load food items.");
    }
  };

  const login = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email,
          password
        }
      );

      if (response.data.success) {
        const loggedUser = response.data.user;

        setToken(response.data.token);
        setUser(loggedUser);

        localStorage.setItem(
          "foodrush_token",
          response.data.token
        );

        localStorage.setItem(
          "foodrush_user",
          JSON.stringify(loggedUser)
        );

        setPage("home");
        setMessage("");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Login failed"
      );
    }
  };

  const register = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        {
          name,
          email,
          phone,
          password
        }
      );

      if (response.data.success) {
        setMessage(
          "Registration successful. Please login."
        );

        setAuthMode("login");
        setPassword("");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Registration failed"
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("foodrush_token");
    localStorage.removeItem("foodrush_user");

    setToken("");
    setUser(null);
    setCart([]);
    setPage("login");
  };

  const addToCart = (food) => {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === food.id
      );

      if (existing) {
        return currentCart.map((item) =>
          item.id === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...food,
          quantity: 1
        }
      ];
    });

    setMessage(`${food.name} added to cart`);
    setTimeout(() => setMessage(""), 1800);
  };

  const increaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1
            }
          : item
      )
    );
  };

  const decreaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartCount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart]);

  const filteredFoods = foods.filter((food) => {
    const matchesCategory =
      category === "All" ||
      food.category === category;

    const matchesSearch =
      food.name
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const placeOrder = async () => {
    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    if (!address.trim()) {
      setMessage("Please enter your delivery address.");
      return;
    }

    try {
      setPlacingOrder(true);

      const response = await axios.post(
        `${API_URL}/api/orders`,
        {
          items: cart,
          total_amount: cartTotal,
          delivery_address: address
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setCart([]);
        setAddress("");
        setCartOpen(false);

        setMessage(
          `Order #${response.data.order.id} placed successfully! 🎉`
        );

        setTimeout(() => {
          setMessage("");
        }, 4000);
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
        "Unable to place order."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  if (page === "login") {
    return (
      <div className="auth-page">

        <div className="auth-left">
          <div className="brand-large">
            🍔 <span>FoodRush</span>
          </div>

          <h1>
            Delicious food.
            <br />
            Delivered fast.
          </h1>

          <p>
            Order your favorite meals from
            the best restaurants around you.
          </p>

          <div className="food-preview">
            🍕 🍔 🍛 🍜 🍰
          </div>
        </div>

        <div className="auth-card">

          <div className="logo">
            🍔 FoodRush
          </div>

          <h2>
            {authMode === "login"
              ? "Welcome back!"
              : "Create your account"}
          </h2>

          <p className="auth-subtitle">
            {authMode === "login"
              ? "Login to continue ordering delicious food."
              : "Join FoodRush and start ordering."}
          </p>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <form
            onSubmit={
              authMode === "login"
                ? login
                : register
            }
          >

            {authMode === "register" && (
              <>
                <label>Name</label>

                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                />

                <label>Phone</label>

                <input
                  type="text"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  required
                />
              </>
            )}

            <label>Email</label>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button className="primary-button">
              {authMode === "login"
                ? "Login"
                : "Create Account"}
            </button>

          </form>

          <div className="auth-switch">

            {authMode === "login" ? (
              <>
                Don't have an account?

                <button
                  onClick={() => {
                    setAuthMode("register");
                    setMessage("");
                  }}
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                Already have an account?

                <button
                  onClick={() => {
                    setAuthMode("login");
                    setMessage("");
                  }}
                >
                  Login
                </button>
              </>
            )}

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="app">

      <header className="navbar">

        <div className="brand">
          🍔 <span>FoodRush</span>
        </div>

        <div className="search-box">

          <span>🔍</span>

          <input
            type="text"
            placeholder="Search for pizza, burger, biryani..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="nav-actions">

          <button
            className="cart-button"
            onClick={() => setCartOpen(true)}
          >
            🛒 Cart

            {cartCount > 0 && (
              <span className="cart-count">
                {cartCount}
              </span>
            )}
          </button>

          <div className="user-menu">
            👤 {user?.name}
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>

      {message && (
        <div className="toast">
          {message}
        </div>
      )}

      <main>

        <section className="hero">

          <div className="hero-content">

            <span className="hero-tag">
              ⚡ FAST DELIVERY
            </span>

            <h1>
              Hungry?
              <br />
              <span>We've got you.</span>
            </h1>

            <p>
              Fresh food from your favorite
              restaurants, delivered straight
              to your door.
            </p>

            <button
              className="hero-button"
              onClick={() =>
                document
                  .getElementById("food-section")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              Order Now →
            </button>

          </div>

          <div className="hero-food">
            <div className="hero-circle">
              🍕
            </div>

            <div className="floating-food burger">
              🍔
            </div>

            <div className="floating-food biryani">
              🍛
            </div>

            <div className="floating-food dessert">
              🍰
            </div>
          </div>

        </section>

        <section
          className="category-section"
          id="food-section"
        >

          <h2>
            What are you craving?
          </h2>

          <div className="categories">

            {categories.map((item) => (
              <button
                key={item.name}
                className={
                  category === item.name
                    ? "category active"
                    : "category"
                }
                onClick={() =>
                  setCategory(item.name)
                }
              >
                <span>
                  {item.emoji}
                </span>

                {item.name}
              </button>
            ))}

          </div>

        </section>

        <section className="food-section">

          <div className="section-heading">

            <div>
              <h2>
                Popular near you
              </h2>

              <p>
                Hand-picked favorites for you
              </p>
            </div>

            <span className="food-count">
              {filteredFoods.length} items
            </span>

          </div>

          <div className="food-grid">

            {filteredFoods.map((food) => (

              <div
                className="food-card"
                key={food.id}
              >

                <div className="food-image">

                  <img
                    src={food.image}
                    alt={food.name}
                  />

                  <span className="rating">
                    ⭐ {food.rating}
                  </span>

                </div>

                <div className="food-info">

                  <span className="food-category">
                    {food.category}
                  </span>

                  <h3>
                    {food.name}
                  </h3>

                  <div className="food-bottom">

                    <strong>
                      ₹{food.price}
                    </strong>

                    <button
                      className="add-button"
                      onClick={() =>
                        addToCart(food)
                      }
                    >
                      + Add
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </section>

      </main>

      <footer className="footer">
        <strong>🍔 FoodRush</strong>
        <span>
          Delicious food delivered fast.
        </span>
      </footer>

      {cartOpen && (

        <div
          className="cart-backdrop"
          onClick={() =>
            setCartOpen(false)
          }
        >

          <div
            className="cart-panel"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="cart-header">

              <div>
                <h2>Your Cart 🛒</h2>

                <p>
                  {cartCount} items
                </p>
              </div>

              <button
                className="close-cart"
                onClick={() =>
                  setCartOpen(false)
                }
              >
                ✕
              </button>

            </div>

            {cart.length === 0 ? (

              <div className="empty-cart">

                <div>
                  🛒
                </div>

                <h3>
                  Your cart is empty
                </h3>

                <p>
                  Add some delicious food!
                </p>

                <button
                  className="primary-button"
                  onClick={() =>
                    setCartOpen(false)
                  }
                >
                  Browse Food
                </button>

              </div>

            ) : (

              <>

                <div className="cart-items">

                  {cart.map((item) => (

                    <div
                      className="cart-item"
                      key={item.id}
                    >

                      <img
                        src={item.image}
                        alt={item.name}
                      />

                      <div className="cart-item-info">

                        <h3>
                          {item.name}
                        </h3>

                        <p>
                          ₹{item.price}
                        </p>

                        <div className="quantity">

                          <button
                            onClick={() =>
                              decreaseQuantity(
                                item.id
                              )
                            }
                          >
                            −
                          </button>

                          <span>
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              increaseQuantity(
                                item.id
                              )
                            }
                          >
                            +
                          </button>

                        </div>

                      </div>

                      <strong>
                        ₹
                        {item.price *
                          item.quantity}
                      </strong>

                    </div>

                  ))}

                </div>

                <div className="checkout">

                  <h3>
                    Delivery Address
                  </h3>

                  <textarea
                    placeholder="Enter your complete delivery address..."
                    value={address}
                    onChange={(e) =>
                      setAddress(e.target.value)
                    }
                  />

                  <div className="bill">

                    <div>
                      <span>
                        Item Total
                      </span>

                      <span>
                        ₹{cartTotal}
                      </span>
                    </div>

                    <div>
                      <span>
                        Delivery Fee
                      </span>

                      <span>
                        ₹40
                      </span>
                    </div>

                    <div>
                      <span>
                        Taxes & Charges
                      </span>

                      <span>
                        ₹{Math.round(cartTotal * 0.05)}
                      </span>
                    </div>

                    <hr />

                    <div className="grand-total">

                      <span>
                        Total
                      </span>

                      <strong>
                        ₹
                        {cartTotal +
                          40 +
                          Math.round(
                            cartTotal * 0.05
                          )}
                      </strong>

                    </div>

                  </div>

                  <button
                    className="place-order"
                    onClick={placeOrder}
                    disabled={placingOrder}
                  >
                    {placingOrder
                      ? "Placing Order..."
                      : "Place Order →"}
                  </button>

                </div>

              </>
            )}

          </div>

        </div>

      )}

    </div>
  );
}

export default App;
