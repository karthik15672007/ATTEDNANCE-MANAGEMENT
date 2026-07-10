let attendance = JSON.parse(localStorage.getItem("attendance")) || [];

const form = document.getElementById("entryForm");
const tbody = document.getElementById("ledgerBody");
const loadingState = document.getElementById("loadingState");

loadingState.hidden = true;

function displayData() {
    tbody.innerHTML = "";

    attendance.forEach((student, index) => {
        let row = `
            <tr>
                <td>${student.rollNo}</td>
                <td>${student.name}</td>
                <td>${student.date}</td>
                <td>${student.status}</td>
                <td>
                    <button onclick="deleteEntry(${index})">Delete</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

form.addEventListener("submit", function(e) {
    e.preventDefault();

    const student = {
        rollNo: document.getElementById("rollNo").value,
        name: document.getElementById("name").value,
        date: document.getElementById("date").value,
        status: document.getElementById("status").value
    };

    attendance.push(student);

    localStorage.setItem("attendance", JSON.stringify(attendance));

    displayData();

    form.reset();
});

function deleteEntry(index) {
    attendance.splice(index, 1);
    localStorage.setItem("attendance", JSON.stringify(attendance));
    displayData();
}

displayData();