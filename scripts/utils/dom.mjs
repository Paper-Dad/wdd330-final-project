export function renderWithTemplate(template, parentElement, callback) {
    if (!parentElement) return;
    parentElement.innerHTML = template;
    if (callback) callback();
}

export async function loadTemplate(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load template: ${path} (${res.status})`);
    return res.text();
}