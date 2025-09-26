/**
 * Построитель форм для динамической генерации HTML форм из настраиваемых полей
 * 
 * @class FormBuilder
 */
class FormBuilder {
    constructor(options = {}) {
        this.formId = options.formId || 'dynamic-form';
        this.cssFramework = options.cssFramework || 'tailwind';
        this.enableRealTimeValidation = options.enableRealTimeValidation !== false;
        this.customClasses = options.customClasses || {};
        this.language = options.language || 'ru';
        
        this.fieldRenderers = new Map();
        this._initializeFieldRenderers();
        
        this.fieldCounter = 0;
        this.cssClasses = this._getCSSClasses();
        this.texts = this._getTexts();
    }

    _initializeFieldRenderers() {
        this.fieldRenderers.set(FIELD_TYPES.TEXT, this._renderTextField.bind(this));
        this.fieldRenderers.set(FIELD_TYPES.PHONE, this._renderPhoneField.bind(this));
        this.fieldRenderers.set(FIELD_TYPES.EMAIL, this._renderEmailField.bind(this));
        this.fieldRenderers.set(FIELD_TYPES.NUMBER, this._renderNumberField.bind(this));
        this.fieldRenderers.set(FIELD_TYPES.SELECT, this._renderSelectField.bind(this));
        this.fieldRenderers.set(FIELD_TYPES.CHECKBOX, this._renderCheckboxField.bind(this));
        this.fieldRenderers.set(FIELD_TYPES.DATE, this._renderDateField.bind(this));
        this.fieldRenderers.set(FIELD_TYPES.TEXTAREA, this._renderTextareaField.bind(this));
    }

    _getCSSClasses() {
        return {
            form: 'space-y-6',
            fieldContainer: 'space-y-2',
            label: 'block text-sm font-medium text-gray-700',
            requiredMark: 'text-red-500 ml-1',
            input: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            textarea: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm',
            select: 'mt-1 block w-full rounded-md border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm',
            checkbox: 'h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded',
            checkboxContainer: 'flex items-center',
            checkboxLabel: 'ml-2 block text-sm text-gray-900',
            error: 'mt-2 text-sm text-red-600',
            description: 'mt-2 text-sm text-gray-500',
            inputError: 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500',
            inputSuccess: 'border-green-300 focus:border-green-500 focus:ring-green-500',
            ...this.customClasses
        };
    }

    _getTexts() {
        return {
            required: 'Обязательное поле',
            invalidEmail: 'Неверный формат email',
            selectOption: 'Выберите значение...'
        };
    }

    generateFormHTML(customFields, values = {}) {
        return this.generateForm(customFields, values);
    }

    generateForm(customFields, values = {}) {
        if (!Array.isArray(customFields)) {
            throw new Error('customFields должен быть массивом');
        }
        
        const activeFields = customFields.filter(field => field.active);
        const sortedFields = activeFields.sort((a, b) => a.order - b.order);
        
        let formHTML = `<form id="${this.formId}" class="${this.cssClasses.form}" novalidate>`;
        
        for (const field of sortedFields) {
            formHTML += this._renderField(field, values[field.name] || null);
        }
        
        formHTML += '</form>';
        return formHTML;
    }

    _renderField(field, value) {
        const fieldId = this._generateFieldId(field);
        const renderer = this.fieldRenderers.get(field.type);
        
        if (!renderer) {
            return '';
        }
        
        const fieldHTML = renderer(field, value, fieldId);
        
        return `
            <div class="${this.cssClasses.fieldContainer}" data-field-name="${field.name}">
                ${fieldHTML}
            </div>
        `;
    }

    _generateFieldId(field) {
        return `${this.formId}_${field.name}_${++this.fieldCounter}`;
    }

    _renderLabel(field, fieldId) {
        const requiredMark = field.required ? `<span class="${this.cssClasses.requiredMark}">*</span>` : '';
        return `<label for="${fieldId}" class="${this.cssClasses.label}">${field.label}${requiredMark}</label>`;
    }

    _renderDescription(field) {
        return field.description ? `<div class="${this.cssClasses.description}">${field.description}</div>` : '';
    }

    _renderErrorContainer(fieldName) {
        return `<div class="${this.cssClasses.error}" id="error-${fieldName}" style="display: none;"></div>`;
    }

    _getCommonAttributes(field, fieldId, value) {
        let attributes = `id="${fieldId}" name="${field.name}" class="${this.cssClasses.input}"`;
        
        if (field.required) attributes += ' required';
        if (value != null) attributes += ` value="${this._escapeHtml(value)}"`;
        if (this.enableRealTimeValidation) attributes += ' data-validate="true"';
        
        return attributes;
    }

    _escapeHtml(text) {
        const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
        return String(text).replace(/[&<>"']/g, char => map[char]);
    }

    // Рендереры полей
    _renderTextField(field, value, fieldId) {
        const attributes = this._getCommonAttributes(field, fieldId, value);
        let inputAttributes = attributes;
        
        if (field.settings.placeholder) {
            inputAttributes += ` placeholder="${this._escapeHtml(field.settings.placeholder)}"`;
        }
        if (field.settings.maxLength) {
            inputAttributes += ` maxlength="${field.settings.maxLength}"`;
        }
        
        return `
            ${this._renderLabel(field, fieldId)}
            <input type="text" ${inputAttributes}>
            ${this._renderDescription(field)}
            ${this._renderErrorContainer(field.name)}
        `;
    }

    _renderPhoneField(field, value, fieldId) {
        const attributes = this._getCommonAttributes(field, fieldId, value);
        let inputAttributes = attributes + ' type="tel"';
        
        if (field.settings.placeholder) {
            inputAttributes += ` placeholder="${this._escapeHtml(field.settings.placeholder)}"`;
        }
        
        return `
            ${this._renderLabel(field, fieldId)}
            <input ${inputAttributes}>
            ${this._renderDescription(field)}
            ${this._renderErrorContainer(field.name)}
        `;
    }

    _renderEmailField(field, value, fieldId) {
        const attributes = this._getCommonAttributes(field, fieldId, value);
        let inputAttributes = attributes + ' type="email"';
        
        if (field.settings.placeholder) {
            inputAttributes += ` placeholder="${this._escapeHtml(field.settings.placeholder)}"`;
        }
        
        return `
            ${this._renderLabel(field, fieldId)}
            <input ${inputAttributes}>
            ${this._renderDescription(field)}
            ${this._renderErrorContainer(field.name)}
        `;
    }

    _renderNumberField(field, value, fieldId) {
        const attributes = this._getCommonAttributes(field, fieldId, value);
        let inputAttributes = attributes + ' type="number"';
        
        if (field.settings.placeholder) {
            inputAttributes += ` placeholder="${this._escapeHtml(field.settings.placeholder)}"`;
        }
        if (field.settings.min != null) {
            inputAttributes += ` min="${field.settings.min}"`;
        }
        if (field.settings.max != null) {
            inputAttributes += ` max="${field.settings.max}"`;
        }
        if (field.settings.step) {
            inputAttributes += ` step="${field.settings.step}"`;
        }
        
        return `
            ${this._renderLabel(field, fieldId)}
            <input ${inputAttributes}>
            ${this._renderDescription(field)}
            ${this._renderErrorContainer(field.name)}
        `;
    }

    _renderSelectField(field, value, fieldId) {
        let selectAttributes = `id="${fieldId}" name="${field.name}" class="${this.cssClasses.select}"`;
        
        if (field.required) selectAttributes += ' required';
        if (field.settings.multiple) selectAttributes += ' multiple';
        if (this.enableRealTimeValidation) selectAttributes += ' data-validate="true"';
        
        let optionsHTML = '';
        
        if (!field.required && field.settings.allowEmpty && !field.settings.multiple) {
            optionsHTML += `<option value="">${field.settings.placeholder || this.texts.selectOption}</option>`;
        }
        
        for (const option of field.settings.options || []) {
            if (!option.active) continue;
            
            const isSelected = field.settings.multiple ? 
                (Array.isArray(value) && value.includes(option.value)) :
                (value === option.value);
            
            const selectedAttr = isSelected ? ' selected' : '';
            optionsHTML += `<option value="${this._escapeHtml(option.value)}"${selectedAttr}>${this._escapeHtml(option.label)}</option>`;
        }
        
        return `
            ${this._renderLabel(field, fieldId)}
            <select ${selectAttributes}>${optionsHTML}</select>
            ${this._renderDescription(field)}
            ${this._renderErrorContainer(field.name)}
        `;
    }

    _renderCheckboxField(field, value, fieldId) {
        const isChecked = Boolean(value);
        const checkedAttr = isChecked ? ' checked' : '';
        
        let inputAttributes = `id="${fieldId}" name="${field.name}" type="checkbox" value="true" class="${this.cssClasses.checkbox}"${checkedAttr}`;
        
        if (field.required) inputAttributes += ' required';
        if (this.enableRealTimeValidation) inputAttributes += ' data-validate="true"';
        
        return `
            <div class="${this.cssClasses.checkboxContainer}">
                <input ${inputAttributes}>
                <label for="${fieldId}" class="${this.cssClasses.checkboxLabel}">
                    ${field.label}
                    ${field.required ? `<span class="${this.cssClasses.requiredMark}">*</span>` : ''}
                </label>
            </div>
            ${this._renderDescription(field)}
            ${this._renderErrorContainer(field.name)}
        `;
    }

    _renderDateField(field, value, fieldId) {
        const attributes = this._getCommonAttributes(field, fieldId, value);
        let inputAttributes = attributes + ' type="date"';
        
        if (field.settings.minDate) {
            const minDate = new Date(field.settings.minDate);
            inputAttributes += ` min="${minDate.toISOString().split('T')[0]}"`;
        }
        if (field.settings.maxDate) {
            const maxDate = new Date(field.settings.maxDate);
            inputAttributes += ` max="${maxDate.toISOString().split('T')[0]}"`;
        }
        
        return `
            ${this._renderLabel(field, fieldId)}
            <input ${inputAttributes}>
            ${this._renderDescription(field)}
            ${this._renderErrorContainer(field.name)}
        `;
    }

    _renderTextareaField(field, value, fieldId) {
        let textareaAttributes = `id="${fieldId}" name="${field.name}" class="${this.cssClasses.textarea}"`;
        
        if (field.required) textareaAttributes += ' required';
        if (field.settings.placeholder) {
            textareaAttributes += ` placeholder="${this._escapeHtml(field.settings.placeholder)}"`;
        }
        if (field.settings.rows) textareaAttributes += ` rows="${field.settings.rows}"`;
        if (field.settings.maxLength) textareaAttributes += ` maxlength="${field.settings.maxLength}"`;
        if (this.enableRealTimeValidation) textareaAttributes += ' data-validate="true"';
        
        const textValue = value ? this._escapeHtml(value) : '';
        
        return `
            ${this._renderLabel(field, fieldId)}
            <textarea ${textareaAttributes}>${textValue}</textarea>
            ${this._renderDescription(field)}
            ${this._renderErrorContainer(field.name)}
        `;
    }

    generateValidationScript(customFields) {
        const activeFields = customFields.filter(field => field.active);
        
        return `
        (function() {
            const form = document.getElementById('${this.formId}');
            if (!form) return;
            
            const validators = {
                ${activeFields.map(field => `'${field.name}': ${JSON.stringify(field.validationRules)}`).join(',\n                ')}
            };
            
            const texts = ${JSON.stringify(this.texts)};
            
            function validateField(fieldName, value, rules) {
                const errors = [];
                
                if (rules.required && (!value || value.toString().trim() === '')) {
                    errors.push(texts.required);
                    return errors;
                }
                
                return errors;
            }
            
            function showFieldError(fieldName, errors) {
                const field = form.querySelector('[name="' + fieldName + '"]');
                const errorContainer = document.getElementById('error-' + fieldName);
                
                if (field && errorContainer) {
                    if (errors.length > 0) {
                        field.classList.add('${this.cssClasses.inputError}');
                        errorContainer.textContent = errors[0];
                        errorContainer.style.display = 'block';
                    } else {
                        field.classList.remove('${this.cssClasses.inputError}');
                        errorContainer.style.display = 'none';
                    }
                }
            }
            
            function validateForm() {
                let isValid = true;
                const formData = new FormData(form);
                
                for (const [fieldName, rules] of Object.entries(validators)) {
                    const value = formData.get(fieldName);
                    const errors = validateField(fieldName, value, rules);
                    showFieldError(fieldName, errors);
                    
                    if (errors.length > 0) {
                        isValid = false;
                    }
                }
                
                return isValid;
            }
            
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                if (validateForm()) {
                    form.dispatchEvent(new CustomEvent('formValid', {
                        detail: { formData: new FormData(form) }
                    }));
                } else {
                    form.dispatchEvent(new CustomEvent('formInvalid'));
                }
            });
            
            window.validateDynamicForm = validateForm;
        })();
        `;
    }

    extractFormData(form, customFields) {
        const formElement = typeof form === 'string' ? document.getElementById(form) : form;
        
        if (!formElement) {
            throw new Error('Форма не найдена');
        }
        
        const formData = new FormData(formElement);
        const result = {};
        
        for (const field of customFields) {
            if (!field.active) continue;
            
            const rawValue = formData.get(field.name);
            result[field.name] = this._processFieldValue(field, rawValue);
        }
        
        return result;
    }

    _processFieldValue(field, rawValue) {
        if (rawValue === null || rawValue === undefined || rawValue === '') {
            return null;
        }
        
        switch (field.type) {
            case FIELD_TYPES.NUMBER:
                const numValue = Number(rawValue);
                return isNaN(numValue) ? null : numValue;
                
            case FIELD_TYPES.CHECKBOX:
                return rawValue === 'true' || rawValue === true;
                
            case FIELD_TYPES.DATE:
                try {
                    return new Date(rawValue);
                } catch {
                    return null;
                }
                
            case FIELD_TYPES.SELECT:
                if (field.settings.multiple) {
                    return Array.isArray(rawValue) ? rawValue : [rawValue];
                }
                return rawValue;
                
            default:
                return String(rawValue);
        }
    }

    validateFormData(formData, customFields) {
        let result = ValidationResult.success();
        
        for (const field of customFields) {
            if (!field.active) continue;
            
            const value = formData[field.name];
            const fieldValidation = field.validateValue(value);
            
            if (!fieldValidation.isValid) {
                for (const error of fieldValidation.errors) {
                    result = result.addFieldError(field.name, error);
                }
            }
        }
        
        return result;
    }

    createFormPackage(customFields, values = {}) {
        return {
            html: this.generateForm(customFields, values),
            script: this.generateValidationScript(customFields),
            formId: this.formId,
            fields: customFields.filter(f => f.active).map(f => f.name)
        };
    }
}

// Глобальная доступность
window.FormBuilder = FormBuilder;
