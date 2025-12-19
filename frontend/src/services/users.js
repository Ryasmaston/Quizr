// import {apiFetch} from "./api";

// export async function createUser(profile) {
//     const res = await apiFetch("/users", {
//         method: "POST",
//         headers: {"Content-Type": "application/json"},
//         body: JSON.stringify(profile),
//     });

//     if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.message || "Feailed to create user");
//     }

//     return res.json();
// }