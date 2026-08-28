# Releases

## v0.1.0

* Core Platform
* Organizations
* Branches

---

## v0.2.0

* Authentication
* RBAC
* Roles
* Permissions

---

## v0.3.0

* Customers
* Suppliers
* Product Categories
* Products
* Inventory Core

---

## v0.4.0

* Purchase Orders
* Purchase Order Items
* Purchase Order Workflow
* Goods Receipts
* Purchase Invoices
* Purchase Invoice Items
* Purchase Returns
* Inventory integration
* Automatic stock updates
* Purchase inventory movements

---

## v0.5.0

* Stock Adjustments
* Inventory Transfers
* Inventory Costing
* Stock Balance & Valuation
* Inventory History / Kardex
* Inventory Validation & Integrity
* Branch-level inventory control
* Inventory movements as the source of truth

## v0.6.0

* Web Foundation Architecture
* JWT Login & Auto Token Interceptors
* Multi-Tenant Application Layout & Sidebar Navigation
* Corporate & Branch UI Catalogs
* Analytical Stock Dashboard & Real-Time Valuation 
* Inventory Movements Auditor & Physical Adjustments Form
* Inter-Branch Logistical Transfers UI
* Individual Product Analytical Kardex View

## v0.7.0

* Transactional Suppliers Directory with Latam tax selectors
* Purchase Orders Workflow Board (`DRAFT`, `CONFIRMED`, `CANCELLED`)
* Master-Detail Step-by-Step Purchasing Assistant
* Physical Goods Receipts Stock-In Verification Module
* Accounts Payable Purchase Invoices Ledger with Due-Date semaphores
* Supply Chain Reverse Logistics Purchase Returns UI

## v0.8.0

* Customer Relationship Management (CRM) Core View
* Organizational Personnel Audit Directory mapped by Branch
* Reactive Security Control Grid with nested database mapper
* On-the-fly User-Role Assignment Panel utilizing granular DTO overrides

## v0.9.0-backend

* Core Commercial Engine for Sales Headers and granular SaleItems in NestJS.
* High-precision mathematical triggers supporting line-item discounts.
* ACID Multi-Tenant transaction controllers preventing negative branch stocks.
* Semantic InventoryMovement ledger using dedicated 'SALE' and 'CUSTOMER_RETURN' enums.
* Standalone Sales Returns and Independent Payments modules.
* BillingResolution state engine for automated and secure legal invoice sequencing.
* Unit-tested permissions infrastructure mapped to the PostgreSQL database.
## v1.0.0-rc4 (Release Candidate 4)

* Complete Point of Sale (POS) infrastructure uncoupling database state from hot memory.
* Multi-tenant Cash Session manager with automatic cash sales variance accounting.
* Advanced Sale Returns manager enforcing historical purchase caps to block double-refund fraud.
* Embedded 80mm thermal receipt generator using native browser print pipeline overrides.
* Interactive post-sale checkout success workflows and real-time ledger re-printing drivers.
