const HOST = location.origin.replace(/^http/, 'ws') + "/wss/";
let socket
function loadUniMenuOptions(options) {
    const uniMenu = document.querySelector("#universidad")
    for (let i of options) {
        let element = document.createElement("option");
        element.innerText = i.universidad
        uniMenu.appendChild(element);
    }
}

function buildTr(params) {
    let element = document.createElement("tr")
    for (let i of params) {
        el = document.createElement("td")
        el.innerText = i
        element.appendChild(el);
    }
    let delBtn = document.createElement("button")
    delBtn.classList.add("delBtn")
    delBtn.innerText = "Delete"
    delBtn.addEventListener("click", function () {
        console.log(this)
        socket.send(JSON.stringify({
            operation: "sendToDb",
            content: 'DELETE FROM examenes where universidad = "' + this.parentElement.cells[0].innerText + '" and facultad = "' + this.parentElement.cells[3].innerText + '" and nombreExamen = "' + this.parentElement.cells[1].innerText + '" and date(fechaExamen) = "' + this.parentElement.cells[2].innerText + '" and curso = ' + this.parentElement.cells[4].innerText
        }))
        this.parentElement.remove()
    })
    element.appendChild(delBtn);
    return element
}

function loadTable(data) {
    const regex = /[0-9]{4}-[0-9]{2}-[0-9]{2}/i;
    const table = document.querySelector("#mainTableShow")
    for (let i of data) {
        console.log(i)
        let tr = buildTr([i.universidad, i.nombreExamen, regex.exec(i.fechaExamen), i.facultad, i.curso, i.convocatoriaEspecial, i.convocatoriaExtraordinaria])
        table.appendChild(tr)
    }
}
function addToTable(data) {
    const regex = /[0-9]{4}-[0-9]{2}-[0-9]{2}/i;
    const table = document.querySelector("#mainTableShow")
    let tr = buildTr([data.universidad, data.nombreExamen, regex.exec(data.fechaExamen), data.facultad, data.curso, data.convocatoriaEspecial, data.convocatoriaExtraordinaria])
    table.appendChild(tr)
}
function filterTableBy(filter) {
    const table = document.querySelector("#mainTableShow")
    for (let i of table.rows) {
        if (!i.classList.contains("index")) {
            if (i.cells[0].innerText != filter) {
                i.classList.toggle("hidden")
            }
        }
    }

}
function resetFilter() {
    const table = document.querySelector("#mainTableShow")
    for (let i of table.rows) {
        if (!i.classList.contains("index")) {
            i.classList.remove("hidden")
        }
    }
}
function loadOptions(context, options, get) {
    console.log("Loading Options...");
    let option = document.querySelector(context)
    for (let i of options[0]) {
        let element = document.createElement("option");
        element.innerText = i[get]
        option.appendChild(element);
    }
}

document.querySelector("#submit").addEventListener("click", function (e) {
    let invalid = false
    let universidad = document.querySelector("#universidad").options[document.querySelector("#universidad").selectedIndex].text
    let facultad = document.querySelector("#carrera").options[document.querySelector("#carrera").selectedIndex].text
    let curso = document.querySelector("#curso").selectedIndex
    let nombreExamen = document.querySelector("#nombreExamen").value
    let fechaExamen = document.querySelector("#date").value
    let convocatoriaEspecial = Number(document.querySelector("#Especial").checked)
    let convocatoriaExtraordinaria = Number(document.querySelector("#Extraordinaria").checked)
    function validate(cssSelector) {
        try {
            if (document.querySelector(cssSelector).options[document.querySelector(cssSelector).selectedIndex].text == 0) {
                document.querySelector(cssSelector).labels[0].classList.toggle("missing")
                return true
            }
        } catch (error) {
            if (document.querySelector(cssSelector).value.length == 0) {
                document.querySelector(cssSelector).labels[0].classList.toggle("missing")
                return true
            }
        }
    }
    invalid = validate("#universidad")
    invalid = validate("#carrera")
    invalid = validate("#curso")
    invalid = validate("#nombreExamen")
    invalid = validate("#date")
    if (invalid) {
        return
    }
    else {
        socket.send(JSON.stringify({
            operation: "sendToDb",
            content: 'INSERT INTO `examenes` VALUES(' + '"' + universidad + '","' + facultad + '","' + nombreExamen + '","' + fechaExamen + '",' + convocatoriaEspecial + ',' + convocatoriaExtraordinaria + ',' + curso + ')'
        }))
    }
    addToTable({ universidad, nombreExamen, fechaExamen, facultad, curso, convocatoriaEspecial, convocatoriaExtraordinaria })
})

function resetOptions() {
    let selectors = document.querySelector("#carrera")
    selectors.innerHTML = "<option>Selecione Una</option>"
}
document.querySelector("#submit").addEventListener("click", function () {
    //TODO connect dates to db
})
document.querySelector("#universidad").addEventListener("change", async function () {
    console.log("Sent msg to WS");
    resetOptions()
    if (this.selectedIndex != 0) {
        resetFilter()
        filterTableBy(this.options[this.selectedIndex].text)
        socket.send(JSON.stringify({
            operation: "getFromDb",
            context: "#carrera",
            get: "facultad",
            content: "SELECT facultad FROM facultades where universidad = '" + this.options[this.selectedIndex].text + "'"
        }))
    }
})


load_socket();

function load_socket() {
    socket = new WebSocket(HOST, "main");

    socket.addEventListener("open", function (event) {
        console.log("connected");
    });

    socket.addEventListener("message", function (event) {
        let msg = JSON.parse(event.data);
        console.log("Recived message: " + msg);
        if (msg.operation == "wssUpdate") {
            console.log("recieved");
            let universidades = msg.content.universidades;
            let data = msg.content.data;
            loadTable(data[0])
            loadUniMenuOptions(universidades[0])
        }
        if (msg.operation == "updateFromDb") {
            loadOptions(msg.context, msg.content, msg.get)
        }
        if (msg.operation == "ResponseFromDb") {
            if (msg.type == "QueryResponse") {
                console.log(msg.response)
            }
        }
    });
}