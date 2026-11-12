const API = "/todos";
const list = document.getElementById("list");
const form = document.getElementById("form");
const titleInput = document.getElementById("title");
const errorBox = document.getElementById("error");

async function request(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.details?.fieldErrors?.title?.[0] || data.error || "Error");
  }
  return data;
}

function button(className, text, onClick) {
  const b = document.createElement("button");
  b.className = `btn sm ${className}`;
  b.type = "button";
  b.textContent = text;
  b.onclick = onClick;
  return b;
}

async function load() {
  let todos;
  try {
    todos = await request(API);
  } catch (e) {
    errorBox.textContent = e.message;
    return;
  }
  list.innerHTML = "";
  if (todos.length === 0) {
    list.innerHTML = '<li class="empty">No tasks yet</li>';
    return;
  }

  for (const todo of todos) {
    const li = document.createElement("li");
    if (todo.completed) li.className = "done";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `Mark "${todo.title}" as done`);
    checkbox.onchange = () => act(() => update(todo, { completed: checkbox.checked }));

    const span = document.createElement("span");
    span.textContent = todo.title;

    const editBtn = button("edit", "Edit", () => {
      const title = prompt("New name:", todo.title);
      if (title !== null) act(() => update(todo, { title }));
    });
    const delBtn = button("danger", "Delete", () => act(() => remove(todo.id)));

    li.append(checkbox, span, editBtn, delBtn);
    list.appendChild(li);
  }
}

const update = (todo, changes) =>
  request(`${API}/${todo.id}`, {
    method: "PUT",
    body: JSON.stringify({ title: todo.title, completed: todo.completed, ...changes }),
  });

const remove = (id) => request(`${API}/${id}`, { method: "DELETE" });

// Runs an action, shows any error, then refreshes the list
async function act(fn) {
  try {
    errorBox.textContent = "";
    await fn();
  } catch (e) {
    errorBox.textContent = e.message;
  }
  load();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  act(async () => {
    await request(API, { method: "POST", body: JSON.stringify({ title: titleInput.value }) });
    titleInput.value = "";
  });
});

load();
