// Shared gate to prevent /me fetches during signup
// (between Firebase auth creation and DB user creation)
let _isSigningUp = false;
export const isSigningUp = () => _isSigningUp;
export const setSigningUp = (v) => { _isSigningUp = v; };
