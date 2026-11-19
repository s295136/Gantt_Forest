import { formatDateISO, addDays, parseDate } from '../utils/date.js';
import { parseRawProgress } from '../utils/helper.js';

export class TableView {
    constructor(container, handlers) {
        this.container = container;
        this.handlers = handlers; // { onUpdateField, onOpenEditModal, onLocateTask }
    }

    render(tasks) {
        this.container.innerHTML = '';
        tasks.forEach(t => {
            const isParent = t.parentId === null;
            const endDateStr = formatDateISO(addDays(parseDate(t.start), (t.duration || 1) - 1));
            const progressVal = Math.round(parseFloat(t.progress) || 0);

            const row = document.createElement('div');
            row.className = `flex text-xs h-[40px] items-center hover:bg-slate-50 transition-colors ${isParent ? 'bg-slate-100/70 font-semibold' : ''}`;
            row.dataset.id = t.id;

            row.innerHTML = `
                <div class="w-10 text-center shrink-0 border-r border-slate-200 text-slate-500 font-mono text-[11px]">${t.id}</div>
                <div class="flex-1 min-w-[140px] px-2 border-r border-slate-200 flex items-center space-x-1 overflow-hidden">
                    ${isParent ? `
                        <button class="btn-toggle-expand w-4 h-4 text-slate-500 hover:text-slate-800 shrink-0" data-id="${t.id}">
                            <i class="fa-solid fa-chevron-${t.expanded ? 'down' : 'right'}"></i>
                        </button>
                    ` : '<span class="w-4 shrink-0"></span>'}
                    <span class="truncate cursor-pointer hover:text-brand-600 font-medium btn-locate-task" data-id="${t.id}">${t.name}</span>
                </div>
                <div class="w-20 px-1 border-r border-slate-200 text-center truncate text-slate-600">${t.owner || '-'}</div>
                <div class="w-24 px-1 border-r border-slate-200 text-center">
                    <input type="date" value="${t.start}" data-field="start" data-id="${t.id}" class="tbl-input w-full text-center bg-transparent focus:bg-white border-0 focus:ring-1 focus:ring-brand-500 rounded text-xs px-0 py-0.5">
                </div>
                <div class="w-16 px-1 border-r border-slate-200 text-center">
                    <input type="number" min="0" value="${t.duration}" data-field="duration" data-id="${t.id}" class="tbl-input w-full text-center bg-transparent focus:bg-white border-0 focus:ring-1 focus:ring-brand-500 rounded text-xs px-0 py-0.5 font-mono">
                </div>
                <div class="w-24 px-1 border-r border-slate-200 text-center text-slate-500 text-[11px] font-mono">${endDateStr}</div>
                <div class="w-16 px-1 border-r border-slate-200 text-center flex items-center justify-center">
                   <input type="number" min="0" max="100" value="${progressVal}" data-field="progress" data-id="${t.id}" class="tbl-input w-9 text-right bg-transparent focus:bg-white border-0 focus:ring-1 focus:ring-brand-500 rounded text-xs px-0 py-0.5 font-mono font-semibold text-slate-700">
                   <span class="text-xs text-slate-400 font-semibold ml-0.5">%</span>
                </div>
                <div class="w-14 px-1 text-center flex items-center justify-center space-x-1">
                    <button class="btn-edit-modal text-slate-400 hover:text-brand-600 p-1" data-id="${t.id}" title="編輯細節">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
            `;
            this.container.appendChild(row);
        });

        this.bindEvents();
    }

    bindEvents() {
        this.container.querySelectorAll('.tbl-input').forEach(input => {
            input.onchange = (e) => {
                const id = parseInt(e.target.dataset.id);
                const field = e.target.dataset.field;
                let val = e.target.value;
                if (field === 'duration' || field === 'progress') {
                    val = parseRawProgress(val);
                }
                this.handlers.onUpdateField(id, field, val);
            };
        });

        this.container.querySelectorAll('.btn-edit-modal').forEach(btn => {
            btn.onclick = () => this.handlers.onOpenEditModal(parseInt(btn.dataset.id));
        });

        this.container.querySelectorAll('.btn-locate-task').forEach(span => {
            span.onclick = () => this.handlers.onLocateTask(parseInt(span.dataset.id));
        });
    }
}
