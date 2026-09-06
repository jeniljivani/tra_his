let db;

// Database open
const request = indexedDB.open("PaymentTrackerDB", 1);

request.onupgradeneeded = function (event) {

    db = event.target.result;

    if (!db.objectStoreNames.contains("transactions")) {

        db.createObjectStore("transactions", {
            keyPath: "id",
            autoIncrement: true
        });

    }
};

request.onsuccess = function (event) {

    db = event.target.result;

    loadTransactions();
};

request.onerror = function () {

    alert("Database error!");
};


// Add transaction
$("#transactionForm").on("submit", function (e) {

    e.preventDefault();

    let type = $("#type").val();
    let method = $("#method").val();
    let amount = Number($("#amount").val());
    let note = $("#note").val();

    let transaction = {

        type: type,
        method: method,
        amount: amount,
        note: note,
        date: new Date().toISOString()

    };

    let tx = db.transaction(["transactions"], "readwrite");

    let store = tx.objectStore("transactions");

    store.add(transaction);

    tx.oncomplete = function () {

        $("#transactionForm")[0].reset();

        loadTransactions();

    };

});


// Load transactions
function loadTransactions() {

    let tx = db.transaction(["transactions"], "readonly");

    let store = tx.objectStore("transactions");

    let request = store.getAll();

    request.onsuccess = function () {

        let data = request.result;

        $("#transactionList").html("");

        let income = 0;
        let expense = 0;

        data.reverse().forEach(function (item) {

            if (item.type === "income") {
                income += item.amount;
            } else {
                expense += item.amount;
            }

            let html = `

                <div class="transaction">

                    <div class="d-flex justify-content-between">

                        <div>

                            <strong>
                                ${item.note || "No Note"}
                            </strong>

                            <div class="text-muted small">
                                ${item.method.toUpperCase()}
                            </div>

                            <div class="text-muted small">
                                ${new Date(item.date).toLocaleString()}
                            </div>

                        </div>

                        <div class="text-end">

                            <div class="amount">
                                ${item.type === "income" ? "+" : "-"} ₹${item.amount}
                            </div>

                            <button
                                class="btn btn-sm btn-outline-danger mt-2"
                                onclick="deleteTransaction(${item.id})"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                </div>
            `;

            $("#transactionList").append(html);

        });

        $("#totalIncome").text("₹" + income);
        $("#totalExpense").text("₹" + expense);

    };
}


// Delete transaction
function deleteTransaction(id) {

    if (!confirm("Delete this transaction?")) {
        return;
    }

    let tx = db.transaction(["transactions"], "readwrite");

    let store = tx.objectStore("transactions");

    store.delete(id);

    tx.oncomplete = function () {

        loadTransactions();

    };
}