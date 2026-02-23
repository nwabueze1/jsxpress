export async function parseFormData(raw) {
    const formData = await raw.formData();
    const fields = {};
    const files = [];
    for (const [name, value] of formData.entries()) {
        if (value instanceof File) {
            files.push({
                fieldName: name,
                fileName: value.name,
                type: value.type,
                size: value.size,
                blob: value,
            });
        }
        else {
            fields[name] = value;
        }
    }
    return { fields, files };
}
//# sourceMappingURL=form-data.js.map