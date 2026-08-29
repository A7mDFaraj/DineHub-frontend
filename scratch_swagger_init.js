
window.onload = function() {
  // Build a system
  let url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  let options = {
  "swaggerDoc": {
    "openapi": "3.0.0",
    "paths": {
      "/api/auth/sign-up/email": {
        "post": {
          "description": "Creates a new Owner or Staff account.\n\n**After sign-up:** A session cookie (`better-auth.session_token`) is automatically set in the response.\n\n**Next step:** Call `GET /api/auth/get-session` to verify the session is active.",
          "operationId": "AuthController_signUpDocs",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SignUpDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Account created — session cookie set automatically"
            },
            "422": {
              "description": "Email already in use or validation error"
            }
          },
          "summary": "Register a new account",
          "tags": [
            "Auth"
          ]
        }
      },
      "/api/auth/sign-in/email": {
        "post": {
          "description": "Authenticates a user and sets an **HTTP-only session cookie**.\n\n**Important:** All subsequent requests to protected admin/staff endpoints will automatically use this cookie — no need to send a token manually.\n\n**Response body** includes the `user` object and `session` details.",
          "operationId": "AuthController_signInDocs",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SignInDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Login successful — session cookie set"
            },
            "401": {
              "description": "Invalid email or password"
            }
          },
          "summary": "Login with email and password",
          "tags": [
            "Auth"
          ]
        }
      },
      "/api/auth/sign-out": {
        "post": {
          "description": "Invalidates the current session and clears the session cookie. The user must login again to access protected endpoints.",
          "operationId": "AuthController_signOutDocs",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Logged out — session cookie cleared"
            },
            "401": {
              "description": "Not logged in"
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Logout",
          "tags": [
            "Auth"
          ]
        }
      },
      "/api/auth/get-session": {
        "get": {
          "description": "Returns the currently logged-in user and session details.\n\n**Use this to:**\n- Verify a session is active after login\n- Fetch the user's role (`admin` or `cashier`) to control UI access\n- Check session expiry\n\nReturns `null` if no active session exists.",
          "operationId": "AuthController_getSessionDocs",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Returns null if not logged in\n\nActive session returned"
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Get current session",
          "tags": [
            "Auth"
          ]
        }
      },
      "/api/admin/users": {
        "get": {
          "description": "Returns all registered users with their role and branch assignment. Only accessible by admin users.",
          "operationId": "UsersController_findAll",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Array of users"
            },
            "403": {
              "description": "Forbidden — admin role required"
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "List all users (Admin only)",
          "tags": [
            "Users"
          ]
        }
      },
      "/api/admin/users/{id}/role": {
        "patch": {
          "description": "Change a user's role between `admin` and `cashier`. Optionally reassign them to a different branch.\n\n**Admin** — full access to all management features (branches, menu, tables, users).\n**Cashier** — can view live orders and the public menu, update order status.",
          "operationId": "UsersController_updateRole",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateUserRoleDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "User updated"
            },
            "403": {
              "description": "Forbidden — admin role required"
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Update user role (Admin only)",
          "tags": [
            "Users"
          ]
        }
      },
      "/api/admin/branches": {
        "post": {
          "operationId": "BranchesController_create",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateBranchDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Create a new branch",
          "tags": [
            "Branches"
          ]
        },
        "get": {
          "operationId": "BranchesController_findAll",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Get all branches",
          "tags": [
            "Branches"
          ]
        }
      },
      "/api/admin/branches/{id}": {
        "get": {
          "operationId": "BranchesController_findOne",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Get a specific branch",
          "tags": [
            "Branches"
          ]
        },
        "patch": {
          "operationId": "BranchesController_update",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateBranchDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Update a branch",
          "tags": [
            "Branches"
          ]
        },
        "delete": {
          "operationId": "BranchesController_remove",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Delete a branch",
          "tags": [
            "Branches"
          ]
        }
      },
      "/api/admin/tables": {
        "post": {
          "description": "Creates a table for a branch.\n    \n**Frontend Tip for QR Codes:**\nAfter fetching all tables, the frontend generates the QR Code by encoding the URL:\n`https://your-domain.com/m/{branchId}/{table.number}`\nusing a library like `qrcode.react`. The backend just manages the table data!",
          "operationId": "TablesController_create",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateTableDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Create a new table (Admin)",
          "tags": [
            "Tables"
          ]
        }
      },
      "/api/admin/tables/{branchId}": {
        "get": {
          "description": "Fetch all tables to display them in the admin dashboard. The frontend can map over these to display printable QR codes for each table.",
          "operationId": "TablesController_getTablesByBranch",
          "parameters": [
            {
              "name": "branchId",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "List all tables for a branch (Admin)",
          "tags": [
            "Tables"
          ]
        }
      },
      "/api/admin/tables/{id}": {
        "patch": {
          "description": "Update table number. All fields are optional — only send what you want to change.",
          "operationId": "TablesController_update",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateTableDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Update a table (Admin)",
          "tags": [
            "Tables"
          ]
        },
        "delete": {
          "operationId": "TablesController_delete",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Delete a table (Admin)",
          "tags": [
            "Tables"
          ]
        }
      },
      "/api/table/{branchId}/{tableNo}": {
        "get": {
          "description": "When a customer scans a QR code, the frontend calls this to fetch the table and branch details to show \"Welcome to Downtown Branch, Table 5\".",
          "operationId": "TablesController_findOne",
          "parameters": [
            {
              "name": "branchId",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "tableNo",
              "required": true,
              "in": "path",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "summary": "Get table details (Public QR)",
          "tags": [
            "Tables"
          ]
        }
      },
      "/api/admin/categories": {
        "post": {
          "description": "Creates a menu category (e.g., \"مشروبات باردة\" / \"Cold Drinks\"). Categories group products in the menu display.",
          "operationId": "CategoriesController_create",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateCategoryDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Category created successfully"
            },
            "400": {
              "description": "Validation error — check required fields"
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Create a new category",
          "tags": [
            "Categories"
          ]
        }
      },
      "/api/admin/categories/{branchId}": {
        "get": {
          "description": "Returns all categories (including hidden ones) with a product count. Used for the admin CMS table.",
          "operationId": "CategoriesController_findAllByBranch",
          "parameters": [
            {
              "name": "branchId",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "List all categories for a branch",
          "tags": [
            "Categories"
          ]
        }
      },
      "/api/admin/categories/{id}": {
        "patch": {
          "description": "Update any field on a category (name, sortOrder, etc.). All fields are optional — only send what you want to change.",
          "operationId": "CategoriesController_update",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateCategoryDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Update a category",
          "tags": [
            "Categories"
          ]
        },
        "delete": {
          "description": "⚠️ **Destructive.** Deletes the category AND all products within it (cascade). Use toggle-visibility instead for soft-hiding.",
          "operationId": "CategoriesController_delete",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Delete a category (and all its products)",
          "tags": [
            "Categories"
          ]
        }
      },
      "/api/admin/categories/{id}/toggle-visibility": {
        "patch": {
          "description": "**Soft-hide** an entire category and all its products from the customer-facing menu.\n    \nUseful for: seasonal menus, lunch-only categories, or temporarily disabled sections.\nDoes NOT delete any data. Customers just won't see it.",
          "operationId": "CategoriesController_toggleVisibility",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Toggle category visibility (hide/show)",
          "tags": [
            "Categories"
          ]
        }
      },
      "/api/admin/attributes": {
        "post": {
          "description": "Creates a reusable bilingual attribute tag for a branch.\n\n**Examples:** \"بدون سكر / No Sugar\", \"حار / Spicy\", \"بدون لاكتوز / Lactose-Free\"\n\nAttributes are created once at the branch level, then assigned to individual products.",
          "operationId": "AttributesController_create",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateAttributeDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Create an attribute tag",
          "tags": [
            "Attributes"
          ]
        }
      },
      "/api/admin/attributes/{branchId}": {
        "get": {
          "description": "Returns all available attribute tags. Use this to populate the attribute selector when creating/editing products.",
          "operationId": "AttributesController_findAllByBranch",
          "parameters": [
            {
              "name": "branchId",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "List all attribute tags for a branch",
          "tags": [
            "Attributes"
          ]
        }
      },
      "/api/admin/attributes/{id}": {
        "patch": {
          "description": "Update the Arabic or English label of an attribute.",
          "operationId": "AttributesController_update",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateAttributeDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Update an attribute tag",
          "tags": [
            "Attributes"
          ]
        },
        "delete": {
          "description": "⚠️ Deletes the attribute and removes it from all products it was assigned to (cascade).",
          "operationId": "AttributesController_delete",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Delete an attribute tag",
          "tags": [
            "Attributes"
          ]
        }
      },
      "/api/menu/{branchId}": {
        "get": {
          "description": "Returns all **visible, available** categories with their nested products and attribute tags.\n    \nThis is the endpoint the QR-scan customer page calls. Hidden or unavailable items are automatically excluded.",
          "operationId": "MenuController_getPublicMenu",
          "parameters": [
            {
              "name": "branchId",
              "required": true,
              "in": "path",
              "description": "UUID of the branch",
              "schema": {
                "example": "e5d7c9-...",
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Array of categories, each containing their products with attributes"
            }
          },
          "summary": "Get full public menu for a branch",
          "tags": [
            "Menu",
            "Menu"
          ]
        }
      },
      "/api/admin/products": {
        "post": {
          "description": "Adds a new menu item. Supports:\n- **Bilingual names & descriptions** (Arabic required, English optional)\n- **Image URL** — store image in your CDN/storage and pass the URL\n- **isAvailable** — instantly mark item as sold out without deleting\n- **isHidden** — hide from menu while keeping in database\n- **sortOrder** — control display order within a category",
          "operationId": "MenuController_createProduct",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateProductDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Product created"
            },
            "400": {
              "description": "Validation error"
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Create a new product",
          "tags": [
            "Menu",
            "Products"
          ]
        }
      },
      "/api/admin/products/branch/{branchId}": {
        "get": {
          "description": "Returns ALL products including hidden and unavailable ones. Designed for the admin CMS management table.",
          "operationId": "MenuController_getProductsAdmin",
          "parameters": [
            {
              "name": "branchId",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "List ALL products for a branch (admin view)",
          "tags": [
            "Menu",
            "Products"
          ]
        }
      },
      "/api/admin/products/{id}": {
        "get": {
          "description": "Fetch complete product details including attributes.",
          "operationId": "MenuController_getProduct",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Get a single product by ID",
          "tags": [
            "Menu",
            "Products"
          ]
        },
        "patch": {
          "description": "Update any product field. All fields are optional — only send what changed. Use specialized toggle endpoints for availability/visibility.",
          "operationId": "MenuController_updateProduct",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateProductDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Update a product",
          "tags": [
            "Menu",
            "Products"
          ]
        },
        "delete": {
          "description": "⚠️ **Destructive.** Permanently removes the product. Consider using `toggle-visibility` for soft-hiding instead.",
          "operationId": "MenuController_deleteProduct",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Delete a product permanently",
          "tags": [
            "Menu",
            "Products"
          ]
        }
      },
      "/api/admin/products/{id}/toggle-availability": {
        "patch": {
          "description": "Flips `isAvailable` between `true` and `false`.\n    \n**Use case:** Real-time \"86 an item\" — mark a product sold out instantly. Customers will see it on the menu but cannot add it to cart.",
          "operationId": "MenuController_toggleAvailability",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Toggle product availability (sold out / back in stock)",
          "tags": [
            "Menu",
            "Products"
          ]
        }
      },
      "/api/admin/products/{id}/toggle-visibility": {
        "patch": {
          "description": "Flips `isHidden` between `true` and `false`.\n    \n**Use case:** Remove an item from the customer-facing menu entirely without deleting it. Useful for seasonal/promotional items.",
          "operationId": "MenuController_toggleVisibility",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Toggle product visibility (hide/show from menu)",
          "tags": [
            "Menu",
            "Products"
          ]
        }
      },
      "/api/admin/products/{id}/attributes": {
        "post": {
          "description": "Assigns a set of attribute tags to a product. **This is a full replacement** — the list you send becomes the new complete set.\n\n**Example:** Send `[\"no-sugar-id\", \"spicy-id\"]` to set exactly those two tags. To clear all tags, send an empty array.",
          "operationId": "MenuController_setAttributes",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SetProductAttributesDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Set product attribute tags",
          "tags": [
            "Menu",
            "Products"
          ]
        }
      },
      "/api/orders": {
        "post": {
          "description": "Submits a new order from a customer at a table.\nNo authentication is required. You must pass valid `branchId` and `tableId` UUIDs that actually exist in the database, otherwise it will return a 400 Bad Request error.",
          "operationId": "OrdersController_createOrder",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateOrderDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Order created successfully"
            },
            "400": {
              "description": "Invalid branchId, tableId, or sold out products"
            }
          },
          "summary": "Create a new order (Public)",
          "tags": [
            "Orders"
          ]
        }
      },
      "/api/orders/{id}": {
        "get": {
          "description": "Allows the customer app to poll the order status without an account. Pass the Order UUID returned from the creation endpoint.",
          "operationId": "OrdersController_getOrder",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "summary": "Check order status (Public)",
          "tags": [
            "Orders"
          ]
        }
      },
      "/api/staff/orders/{branchId}": {
        "get": {
          "description": "Fetches all non-delivered orders for a specific branch. Optionally filter by status.\n    \n**Status values:** `pending`, `preparing`, `ready`\nIf no status filter is provided, returns all non-delivered orders.",
          "operationId": "OrdersController_getLiveOrders",
          "parameters": [
            {
              "name": "branchId",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "status",
              "required": false,
              "in": "query",
              "description": "Filter by specific status",
              "schema": {
                "enum": [
                  "pending",
                  "preparing",
                  "ready"
                ],
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Get live active orders for a branch (Staff)",
          "tags": [
            "Orders"
          ]
        }
      },
      "/api/staff/orders/{branchId}/history": {
        "get": {
          "description": "Returns all delivered (completed) orders for a branch, sorted by most recent.",
          "operationId": "OrdersController_getOrderHistory",
          "parameters": [
            {
              "name": "branchId",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Get delivered orders history (Staff)",
          "tags": [
            "Orders"
          ]
        }
      },
      "/api/staff/orders/{id}/status": {
        "patch": {
          "description": "Progress an order through its lifecycle.\nValid statuses: `pending` -> `preparing` -> `ready` -> `delivered`.",
          "operationId": "OrdersController_updateStatus",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateOrderStatusDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": ""
            }
          },
          "security": [
            {
              "cookie": []
            }
          ],
          "summary": "Update order status (Staff)",
          "tags": [
            "Orders"
          ]
        }
      }
    },
    "info": {
      "title": "DineHub API",
      "description": "## DineHub — QR-Based Restaurant Ordering System\n\nThis API powers the entire DineHub SaaS platform. It is split into three access levels:\n\n### Public Endpoints (No auth required)\n- Browse the menu for any branch: `GET /api/menu/:branchId`\n- Look up a table by its QR code: `GET /api/table/:branchId/:tableNo`\n- Place a new order: `POST /api/orders`\n- Poll order status: `GET /api/orders/:id`\n\n### Auth Endpoints (BetterAuth — email/password)\n- **Sign up**: `POST /api/auth/sign-up/email`\n- **Log in**: `POST /api/auth/sign-in/email`\n- **Log out**: `POST /api/auth/sign-out`\n- **Get session**: `GET /api/auth/get-session`\n> BetterAuth handles sessions via **HTTP-only cookies** automatically. No manual token management needed.\n\n### Admin Endpoints (requires active session — Owner role)\nManage your restaurant: branches, tables, categories, products.\n\n### Staff Endpoints (requires active session — Staff role)\nView live orders and update their status in real time.\n\n---\n**Base URL:** `http://localhost:3000`\n",
      "version": "1.0.0",
      "contact": {
        "name": "DineHub Support",
        "url": "https://dinehub.app",
        "email": "support@dinehub.app"
      },
      "license": {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
      }
    },
    "tags": [
      {
        "name": "Auth",
        "description": "Login, logout, and session management (powered by BetterAuth)"
      },
      {
        "name": "Users",
        "description": "User management — list users and update roles (admin only)"
      },
      {
        "name": "Branches",
        "description": "Branch management (admin only)"
      },
      {
        "name": "Tables",
        "description": "QR table lookup and admin table management"
      },
      {
        "name": "Menu",
        "description": "Public menu for QR-scan customers"
      },
      {
        "name": "Categories",
        "description": "Menu category management (admin)"
      },
      {
        "name": "Products",
        "description": "Product CRUD and toggle availability/visibility (admin)"
      },
      {
        "name": "Orders",
        "description": "Customer ordering and staff order management"
      },
      {
        "name": "Attributes",
        "description": "Reusable product attribute tags like \"Spicy\", \"No Sugar\" (admin)"
      }
    ],
    "servers": [],
    "components": {
      "securitySchemes": {
        "cookie": {
          "type": "apiKey",
          "in": "cookie",
          "name": "better-auth.session_token"
        },
        "bearer": {
          "scheme": "bearer",
          "bearerFormat": "JWT",
          "type": "http"
        }
      },
      "schemas": {
        "SignUpDto": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "Ahmed Al-Faraj",
              "description": "Full name of the user"
            },
            "email": {
              "type": "string",
              "example": "ahmed@dinehub.app",
              "description": "Email address (must be unique)"
            },
            "password": {
              "type": "string",
              "example": "MyStr0ngP@ss!",
              "description": "Password (minimum 8 characters)"
            },
            "role": {
              "type": "string",
              "example": "admin",
              "enum": [
                "admin",
                "cashier"
              ],
              "description": "User role — defaults to cashier if not provided"
            },
            "branchId": {
              "type": "string",
              "example": "REPLACE-WITH-BRANCH-UUID",
              "description": "Branch to assign this user to (nullable for owners who manage all branches)"
            }
          },
          "required": [
            "name",
            "email",
            "password"
          ]
        },
        "SignInDto": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string",
              "example": "ahmed@dinehub.app",
              "description": "Registered email address"
            },
            "password": {
              "type": "string",
              "example": "MyStr0ngP@ss!",
              "description": "Account password"
            }
          },
          "required": [
            "email",
            "password"
          ]
        },
        "UpdateUserRoleDto": {
          "type": "object",
          "properties": {
            "role": {
              "type": "string",
              "example": "admin",
              "enum": [
                "admin",
                "cashier"
              ],
              "description": "New role for the user"
            },
            "branchId": {
              "type": "object",
              "example": "BRANCH-UUID",
              "description": "Optionally reassign user to a different branch. Use `null` or `\"null\"` to remove them from a branch."
            }
          },
          "required": [
            "role"
          ]
        },
        "CreateBranchDto": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "DineHub Downtown"
            },
            "address": {
              "type": "string",
              "example": "123 Main St, City Center"
            }
          },
          "required": [
            "name"
          ]
        },
        "UpdateBranchDto": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "DineHub Downtown"
            },
            "address": {
              "type": "string",
              "example": "123 Main St, City Center"
            }
          }
        },
        "CreateTableDto": {
          "type": "object",
          "properties": {
            "branchId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-BRANCH-UUID",
              "description": "Paste the Branch ID you created in the Branches API"
            },
            "number": {
              "type": "number",
              "example": 5,
              "description": "Table number"
            }
          },
          "required": [
            "branchId",
            "number"
          ]
        },
        "UpdateTableDto": {
          "type": "object",
          "properties": {
            "branchId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-BRANCH-UUID",
              "description": "Paste the Branch ID you created in the Branches API"
            },
            "number": {
              "type": "number",
              "example": 5,
              "description": "Table number"
            }
          }
        },
        "CreateCategoryDto": {
          "type": "object",
          "properties": {
            "branchId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-BRANCH-UUID",
              "description": "The branch this category belongs to"
            },
            "name": {
              "type": "string",
              "example": "Cold Drinks",
              "description": "Primary category name"
            },
            "nameAr": {
              "type": "string",
              "example": "المشروبات الباردة",
              "description": "Category name in Arabic"
            },
            "nameEn": {
              "type": "string",
              "example": "Cold Drinks",
              "description": "Category name in English"
            },
            "sortOrder": {
              "type": "number",
              "example": 0,
              "description": "Display order (lower = shown first)"
            }
          },
          "required": [
            "branchId",
            "name"
          ]
        },
        "UpdateCategoryDto": {
          "type": "object",
          "properties": {
            "branchId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-BRANCH-UUID",
              "description": "The branch this category belongs to"
            },
            "name": {
              "type": "string",
              "example": "Cold Drinks",
              "description": "Primary category name"
            },
            "nameAr": {
              "type": "string",
              "example": "المشروبات الباردة",
              "description": "Category name in Arabic"
            },
            "nameEn": {
              "type": "string",
              "example": "Cold Drinks",
              "description": "Category name in English"
            },
            "sortOrder": {
              "type": "number",
              "example": 0,
              "description": "Display order (lower = shown first)"
            }
          }
        },
        "CreateAttributeDto": {
          "type": "object",
          "properties": {
            "branchId": {
              "type": "string",
              "example": "branch-uuid-here",
              "description": "The branch this attribute belongs to"
            },
            "labelAr": {
              "type": "string",
              "example": "بدون سكر",
              "description": "Attribute label in Arabic (e.g. \"سكر قليل\")"
            },
            "labelEn": {
              "type": "string",
              "example": "No Sugar",
              "description": "Attribute label in English"
            }
          },
          "required": [
            "branchId",
            "labelAr"
          ]
        },
        "UpdateAttributeDto": {
          "type": "object",
          "properties": {
            "branchId": {
              "type": "string",
              "example": "branch-uuid-here",
              "description": "The branch this attribute belongs to"
            },
            "labelAr": {
              "type": "string",
              "example": "بدون سكر",
              "description": "Attribute label in Arabic (e.g. \"سكر قليل\")"
            },
            "labelEn": {
              "type": "string",
              "example": "No Sugar",
              "description": "Attribute label in English"
            }
          }
        },
        "CreateProductDto": {
          "type": "object",
          "properties": {
            "categoryId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-CATEGORY-UUID",
              "description": "Category this product belongs to"
            },
            "nameAr": {
              "type": "string",
              "example": "برجر لحم وجبن",
              "description": "Product name in Arabic (required)"
            },
            "nameEn": {
              "type": "string",
              "example": "Beef & Cheese Burger",
              "description": "Product name in English"
            },
            "descriptionAr": {
              "type": "string",
              "example": "برجر لحم طازج مع جبن شيدر وصوص خاص",
              "description": "Product description in Arabic"
            },
            "descriptionEn": {
              "type": "string",
              "example": "Fresh beef patty with cheddar cheese and special sauce",
              "description": "Product description in English"
            },
            "price": {
              "type": "number",
              "example": 45.5,
              "description": "Product price (will be stored as-is at time of order)"
            },
            "imageUrl": {
              "type": "string",
              "example": "https://cdn.dinehub.app/products/burger.jpg",
              "description": "Product image URL"
            },
            "isAvailable": {
              "type": "boolean",
              "example": true,
              "description": "Whether product is available for ordering. Set false to 86 an item."
            },
            "isHidden": {
              "type": "boolean",
              "example": false,
              "description": "Whether product is hidden from the menu (soft-hide without deleting)"
            },
            "sortOrder": {
              "type": "number",
              "example": 0,
              "description": "Display order within category (lower = shown first)"
            }
          },
          "required": [
            "categoryId",
            "nameAr",
            "price"
          ]
        },
        "UpdateProductDto": {
          "type": "object",
          "properties": {
            "categoryId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-CATEGORY-UUID",
              "description": "Category this product belongs to"
            },
            "nameAr": {
              "type": "string",
              "example": "برجر لحم وجبن",
              "description": "Product name in Arabic (required)"
            },
            "nameEn": {
              "type": "string",
              "example": "Beef & Cheese Burger",
              "description": "Product name in English"
            },
            "descriptionAr": {
              "type": "string",
              "example": "برجر لحم طازج مع جبن شيدر وصوص خاص",
              "description": "Product description in Arabic"
            },
            "descriptionEn": {
              "type": "string",
              "example": "Fresh beef patty with cheddar cheese and special sauce",
              "description": "Product description in English"
            },
            "price": {
              "type": "number",
              "example": 45.5,
              "description": "Product price (will be stored as-is at time of order)"
            },
            "imageUrl": {
              "type": "string",
              "example": "https://cdn.dinehub.app/products/burger.jpg",
              "description": "Product image URL"
            },
            "isAvailable": {
              "type": "boolean",
              "example": true,
              "description": "Whether product is available for ordering. Set false to 86 an item."
            },
            "isHidden": {
              "type": "boolean",
              "example": false,
              "description": "Whether product is hidden from the menu (soft-hide without deleting)"
            },
            "sortOrder": {
              "type": "number",
              "example": 0,
              "description": "Display order within category (lower = shown first)"
            }
          }
        },
        "SetProductAttributesDto": {
          "type": "object",
          "properties": {
            "attributeIds": {
              "example": [
                "attr-uuid-1",
                "attr-uuid-2"
              ],
              "description": "Full list of attribute IDs to assign to this product (replaces existing)",
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "attributeIds"
          ]
        },
        "OrderItemDto": {
          "type": "object",
          "properties": {
            "productId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-PRODUCT-UUID"
            },
            "quantity": {
              "type": "number",
              "example": 2
            }
          },
          "required": [
            "productId",
            "quantity"
          ]
        },
        "CreateOrderDto": {
          "type": "object",
          "properties": {
            "branchId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-BRANCH-UUID"
            },
            "tableId": {
              "type": "string",
              "example": "REPLACE-WITH-YOUR-TABLE-UUID"
            },
            "note": {
              "type": "string",
              "example": "بدون بصل"
            },
            "items": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/OrderItemDto"
              }
            }
          },
          "required": [
            "branchId",
            "tableId",
            "items"
          ]
        },
        "UpdateOrderStatusDto": {
          "type": "object",
          "properties": {
            "status": {
              "type": "string",
              "example": "preparing",
              "enum": [
                "pending",
                "preparing",
                "ready",
                "delivered"
              ]
            }
          },
          "required": [
            "status"
          ]
        }
      }
    }
  },
  "customOptions": {
    "persistAuthorization": true
  }
};
  url = options.swaggerUrl || url
  let urls = options.swaggerUrls
  let customOptions = options.customOptions
  let spec1 = options.swaggerDoc
  let swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (let attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  let ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.initOAuth) {
    ui.initOAuth(customOptions.initOAuth)
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }
  
  window.ui = ui
}
