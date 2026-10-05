import { useState, useEffect } from "react";
import api from "./api";
import "./App.css";

function App() {
  const [page, setPage] = useState(() => {
    const path = window.location.pathname;

    if (path === "/register") return "register";
    if (path === "/products") return "products";
    if (path === "/cart") return "cart";
    if (path === "/orders") return "orders";

    return "login";
  });

  // =====================================================
  // AUTH STATES
  // =====================================================

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // =====================================================
  // PRODUCT STATES
  // =====================================================

  const [products, setProducts] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  // =====================================================
  // CART STATES
  // =====================================================

  const [cart, setCart] = useState(null);
  const [loadingCart, setLoadingCart] = useState(false);

  // =====================================================
  // ORDER STATES
  // =====================================================

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role: "user",
      });

      setMessage(
        "Registration successful! Redirecting to login..."
      );

      setName("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        window.history.pushState({}, "", "/login");
        setPage("login");
        setMessage("");
      }, 1000);
    } catch (err) {
      if (err.response) {
        setError(
          err.response.data?.detail ||
            "Registration failed"
        );
      } else {
        setError("Cannot connect to backend.");
      }
    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post(
        "/auth/login",
        formData,
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );

      localStorage.setItem(
        "access_token",
        response.data.access_token
      );

      setMessage("Login successful!");

      setTimeout(() => {
        window.history.pushState({}, "", "/products");
        setPage("products");
        setMessage("");
      }, 500);
    } catch (err) {
      if (err.response) {
        setError(
          err.response.data?.detail ||
            "Invalid email or password"
        );
      } else {
        setError("Cannot connect to backend.");
      }
    }
  };

  // =====================================================
  // GET PRODUCTS
  // =====================================================

  const getProducts = async () => {
    setLoadingProducts(true);
    setError("");

    try {
      const response = await api.get("/products", {
        params: {
          page: productPage,
          limit: limit,
          search: search,
        },
      });

      console.log(
        "Products response:",
        response.data
      );

      setProducts(response.data.items || []);

      setTotalPages(
        response.data.total_pages || 1
      );
    } catch (err) {
      console.error(
        "Products error:",
        err
      );

      if (err.response) {
        setError(
          err.response.data?.detail ||
            "Failed to load products"
        );
      } else {
        setError("Cannot connect to backend.");
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  // =====================================================
  // GET CART
  // =====================================================

  const getCart = async () => {
    setLoadingCart(true);
    setError("");

    try {
      const response = await api.get("/cart/");

      console.log(
        "Cart response:",
        response.data
      );

      setCart(response.data);
    } catch (err) {
      console.error(
        "Cart error:",
        err
      );

      if (err.response) {
        setError(
          err.response.data?.detail ||
            "Failed to load cart"
        );
      } else {
        setError("Cannot connect to backend.");
      }
    } finally {
      setLoadingCart(false);
    }
  };

  // =====================================================
  // GET ORDERS
  // =====================================================

  const getOrders = async () => {
    setLoadingOrders(true);
    setError("");

    try {
      const response = await api.get("/orders/");

      console.log(
        "Orders response:",
        response.data
      );

      setOrders(response.data.items || []);
    } catch (err) {
      console.error(
        "Orders error:",
        err
      );

      if (err.response) {
        setError(
          err.response.data?.detail ||
            "Failed to load orders"
        );
      } else {
        setError("Cannot connect to backend.");
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  // =====================================================
  // GET ORDER DETAILS
  // =====================================================

  const getOrderDetails = async (orderId) => {
    setLoadingOrder(true);
    setError("");
    setSelectedOrder(null);

    try {
      const response = await api.get(
        `/orders/${orderId}`
      );

      console.log(
        "Order details:",
        response.data
      );

      setSelectedOrder(response.data);
    } catch (err) {
      console.error(
        "Order details error:",
        err
      );

      if (err.response) {
        setError(
          err.response.data?.detail ||
            "Failed to load order details"
        );
      } else {
        setError("Cannot connect to backend.");
      }
    } finally {
      setLoadingOrder(false);
    }
  };

  // =====================================================
  // ADD TO CART
  // =====================================================

  const addToCart = async (productId) => {
    setError("");
    setMessage("");

    try {
      await api.post("/cart/add", {
        product_id: productId,
        quantity: 1,
      });

      setMessage(
        "Product added to cart successfully!"
      );

      await getCart();

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (err) {
      console.error(
        "Add to cart error:",
        err
      );

      if (err.response) {
        setError(
          err.response.data?.detail ||
            "Failed to add product to cart"
        );
      } else {
        setError("Cannot connect to backend.");
      }
    }
  };

  // =====================================================
  // UPDATE CART ITEM
  // =====================================================

  const updateCartItem = async (
    itemId,
    quantity
  ) => {
    if (quantity <= 0) {
      return;
    }

    try {
      await api.put(
        `/cart/${itemId}`,
        {
          quantity: quantity,
        }
      );

      await getCart();
    } catch (err) {
      console.error(
        "Update cart error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Failed to update cart"
      );
    }
  };

  // =====================================================
  // REMOVE CART ITEM
  // =====================================================

  const removeCartItem = async (
    itemId
  ) => {
    try {
      await api.delete(
        `/cart/${itemId}`
      );

      await getCart();
    } catch (err) {
      console.error(
        "Remove cart error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Failed to remove item"
      );
    }
  };

  // =====================================================
  // CLEAR CART
  // =====================================================

  const clearCart = async () => {
    try {
      await api.delete(
        "/cart/clear/all"
      );

      await getCart();
    } catch (err) {
      console.error(
        "Clear cart error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Failed to clear cart"
      );
    }
  };

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  useEffect(() => {
    if (page === "products") {
      getProducts();
    }
  }, [page, productPage]);

  // =====================================================
  // LOAD CART
  // =====================================================

  useEffect(() => {
    if (page === "cart") {
      getCart();
    }
  }, [page]);

  // =====================================================
  // LOAD ORDERS
  // =====================================================

  useEffect(() => {
    if (page === "orders") {
      getOrders();
    }
  }, [page]);

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = (e) => {
    e.preventDefault();

    setProductPage(1);

    getProducts();
  };

  // =====================================================
  // GO TO PAGE
  // =====================================================

  const goToPage = (newPage, path) => {
    window.history.pushState(
      {},
      "",
      path
    );

    setPage(newPage);
    setError("");
    setMessage("");

    if (newPage !== "orders") {
      setSelectedOrder(null);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    localStorage.removeItem(
      "access_token"
    );

    setSelectedOrder(null);

    goToPage(
      "login",
      "/login"
    );
  };

  // =====================================================
  // REGISTER PAGE
  // =====================================================

  if (page === "register") {
    return (
      <div className="auth-container">

        <div className="auth-card">

          <h1>Create Account</h1>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {message && (
            <div className="success">
              {message}
            </div>
          )}

          <form onSubmit={handleRegister}>

            <label>Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button type="submit">
              Register
            </button>

          </form>

          <p className="switch-text">

            Already have an account?{" "}

            <span
              onClick={() =>
                goToPage(
                  "login",
                  "/login"
                )
              }
            >
              Login
            </span>

          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // LOGIN PAGE
  // =====================================================

  if (page === "login") {
    return (
      <div className="auth-container">

        <div className="auth-card">

          <h1>Welcome Back</h1>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {message && (
            <div className="success">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin}>

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button type="submit">
              Login
            </button>

          </form>

          <p className="switch-text">

            Don't have an account?{" "}

            <span
              onClick={() =>
                goToPage(
                  "register",
                  "/register"
                )
              }
            >
              Register
            </span>

          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // PRODUCTS PAGE
  // =====================================================

  if (page === "products") {
    return (
      <div className="products-page">

        <nav className="navbar">

          <h2>
            Digital Product Store
          </h2>

          <div>

            <button
              onClick={() =>
                goToPage(
                  "cart",
                  "/cart"
                )
              }
            >
              Cart
            </button>

            <button
              onClick={() =>
                goToPage(
                  "orders",
                  "/orders"
                )
              }
            >
              Orders
            </button>

            <button
              onClick={logout}
            >
              Logout
            </button>

          </div>

        </nav>

        <div className="products-container">

          <h1>
            Digital Products
          </h1>

          {message && (
            <div className="success">
              {message}
            </div>
          )}

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSearch}
            className="search-form"
          >

            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <button type="submit">
              Search
            </button>

          </form>

          {loadingProducts && (
            <p>
              Loading products...
            </p>
          )}

          {!loadingProducts &&
            products.length === 0 && (
              <p>
                No products found.
              </p>
            )}

          <div className="products-grid">

            {products.map((product) => (

              <div
                className="product-card"
                key={product.id}
              >

                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                  />
                )}

                <h3>
                  {product.name}
                </h3>

                <p>
                  {product.description}
                </p>

                <h4>
                  ₹{product.price}
                </h4>

                <button
                  onClick={() =>
                    addToCart(product.id)
                  }
                >
                  Add to Cart
                </button>

              </div>

            ))}

          </div>

          <div className="pagination">

            <button
              disabled={
                productPage === 1
              }
              onClick={() =>
                setProductPage(
                  productPage - 1
                )
              }
            >
              Previous
            </button>

            {Array.from(
              {
                length: totalPages,
              },
              (_, index) =>
                index + 1
            ).map((number) => (

              <button
                key={number}
                className={
                  productPage === number
                    ? "active-page"
                    : ""
                }
                onClick={() =>
                  setProductPage(number)
                }
              >
                {number}
              </button>

            ))}

            <button
              disabled={
                productPage ===
                totalPages
              }
              onClick={() =>
                setProductPage(
                  productPage + 1
                )
              }
            >
              Next
            </button>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // CART PAGE
  // =====================================================

  if (page === "cart") {
    return (
      <div className="products-page">

        <nav className="navbar">

          <h2>
            Digital Product Store
          </h2>

          <div>

            <button
              onClick={() =>
                goToPage(
                  "products",
                  "/products"
                )
              }
            >
              Products
            </button>

            <button
              onClick={() =>
                goToPage(
                  "orders",
                  "/orders"
                )
              }
            >
              Orders
            </button>

            <button
              onClick={logout}
            >
              Logout
            </button>

          </div>

        </nav>

        <div className="products-container">

          <h1>
            Shopping Cart
          </h1>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {message && (
            <div className="success">
              {message}
            </div>
          )}

          {loadingCart && (
            <p>
              Loading cart...
            </p>
          )}

          {!loadingCart &&
            cart &&
            cart.items &&
            cart.items.length === 0 && (
              <div>

                <h3>
                  Your cart is empty
                </h3>

                <button
                  onClick={() =>
                    goToPage(
                      "products",
                      "/products"
                    )
                  }
                >
                  Continue Shopping
                </button>

              </div>
            )}

          {!loadingCart &&
            cart &&
            cart.items &&
            cart.items.length > 0 && (

              <div>

                {cart.items.map(
                  (item) => (

                    <div
                      className="product-card"
                      key={item.id}
                      style={{
                        marginBottom:
                          "15px",
                      }}
                    >

                      <h3>
                        Product ID:{" "}
                        {item.product_id}
                      </h3>

                      <p>
                        Price: ₹
                        {item.price}
                      </p>

                      <p>
                        Quantity:
                      </p>

                      <button
                        onClick={() =>
                          updateCartItem(
                            item.id,
                            item.quantity - 1
                          )
                        }
                        disabled={
                          item.quantity <= 1
                        }
                      >
                        -
                      </button>

                      <span
                        style={{
                          margin:
                            "0 15px",
                        }}
                      >
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateCartItem(
                            item.id,
                            item.quantity + 1
                          )
                        }
                      >
                        +
                      </button>

                      <br />

                      <button
                        onClick={() =>
                          removeCartItem(
                            item.id
                          )
                        }
                        style={{
                          marginTop:
                            "10px",
                        }}
                      >
                        Remove
                      </button>

                    </div>

                  )
                )}

                <h2>
                  Total: ₹
                  {cart.total_amount}
                </h2>

                <button
                  onClick={clearCart}
                >
                  Clear Cart
                </button>

                <button
                  onClick={() =>
                    goToPage(
                      "products",
                      "/products"
                    )
                  }
                  style={{
                    marginLeft: "10px",
                  }}
                >
                  Continue Shopping
                </button>

              </div>

            )}

        </div>

      </div>
    );
  }

  // =====================================================
  // ORDERS PAGE
  // =====================================================

  if (page === "orders") {
    return (
      <div className="products-page">

        <nav className="navbar">

          <h2>
            Digital Product Store
          </h2>

          <div>

            <button
              onClick={() =>
                goToPage(
                  "products",
                  "/products"
                )
              }
            >
              Products
            </button>

            <button
              onClick={() =>
                goToPage(
                  "cart",
                  "/cart"
                )
              }
            >
              Cart
            </button>

            <button
              onClick={logout}
            >
              Logout
            </button>

          </div>

        </nav>

        <div className="products-container">

          <h1>
            My Orders
          </h1>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {loadingOrders && (
            <p>
              Loading orders...
            </p>
          )}

          {!loadingOrders &&
            orders.length === 0 && (
              <div>

                <h3>
                  No orders found
                </h3>

                <button
                  onClick={() =>
                    goToPage(
                      "products",
                      "/products"
                    )
                  }
                >
                  Continue Shopping
                </button>

              </div>
            )}

          {!loadingOrders &&
            orders.length > 0 && (

              <div>

                {orders.map((order) => (

                  <div
                    className="product-card"
                    key={order.id}
                    style={{
                      marginBottom: "20px",
                    }}
                  >

                    <h3>
                      Order ID: {order.id}
                    </h3>

                    <p>
                      Total: ₹
                      {order.total_amount}
                    </p>

                    <p>
                      Status: {order.status}
                    </p>

                    <p>
                      Date:{" "}
                      {new Date(
                        order.created_at
                      ).toLocaleString()}
                    </p>

                    <h4>
                      Items
                    </h4>

                    {order.items &&
                      order.items.map(
                        (item, index) => (

                          <div
                            key={index}
                            style={{
                              marginBottom:
                                "10px",
                            }}
                          >

                            <p>
                              Product ID:{" "}
                              {item.product_id}
                            </p>

                            <p>
                              Quantity:{" "}
                              {item.quantity}
                            </p>

                            <p>
                              Price: ₹
                              {item.price}
                            </p>

                          </div>

                        )
                      )}

                    <button
                      onClick={() =>
                        getOrderDetails(
                          order.id
                        )
                      }
                    >
                      View Details
                    </button>

                  </div>

                ))}

              </div>

            )}

          {/* =========================================
              ORDER DETAILS
          ========================================= */}

          {loadingOrder && (
            <div className="product-card">
              <p>
                Loading order details...
              </p>
            </div>
          )}

          {selectedOrder && !loadingOrder && (

            <div
              className="product-card"
              style={{
                marginTop: "25px",
              }}
            >

              <h2>
                Order Details
              </h2>

              <p>
                <strong>
                  Order ID:
                </strong>{" "}
                {selectedOrder.id}
              </p>

              <p>
                <strong>
                  Total:
                </strong>{" "}
                ₹
                {selectedOrder.total_amount}
              </p>

              <p>
                <strong>
                  Status:
                </strong>{" "}
                {selectedOrder.status}
              </p>

              <p>
                <strong>
                  Date:
                </strong>{" "}
                {new Date(
                  selectedOrder.created_at
                ).toLocaleString()}
              </p>

              <h3>
                Items
              </h3>

              {selectedOrder.items &&
                selectedOrder.items.map(
                  (item) => (

                    <div
                      key={item.id}
                      style={{
                        marginBottom:
                          "15px",
                        paddingBottom:
                          "10px",
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >

                      <p>
                        <strong>
                          Product ID:
                        </strong>{" "}
                        {item.product_id}
                      </p>

                      <p>
                        <strong>
                          Quantity:
                        </strong>{" "}
                        {item.quantity}
                      </p>

                      <p>
                        <strong>
                          Price:
                        </strong>{" "}
                        ₹{item.price}
                      </p>

                    </div>

                  )
                )}

              <h3>
                Payment
              </h3>

              {selectedOrder.payment ? (

                <div>

                  <p>
                    <strong>
                      Payment ID:
                    </strong>{" "}
                    {selectedOrder.payment.id}
                  </p>

                  <p>
                    <strong>
                      Payment Status:
                    </strong>{" "}
                    {selectedOrder.payment.status}
                  </p>

                  <p>
                    <strong>
                      Amount:
                    </strong>{" "}
                    ₹
                    {selectedOrder.payment.amount}
                  </p>

                  {selectedOrder.payment
                    .stripe_session_id && (
                    <p>
                      <strong>
                        Stripe Session:
                      </strong>{" "}
                      {
                        selectedOrder.payment
                          .stripe_session_id
                      }
                    </p>
                  )}

                </div>

              ) : (

                <p>
                  Payment not completed
                </p>

              )}

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                Close Details
              </button>

            </div>

          )}

        </div>

      </div>
    );
  }

  return null;
}

export default App;