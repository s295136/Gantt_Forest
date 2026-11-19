import { formatDateISO, parseDate, addDays, diffDays } from './utils/date.js';
import { parseRawProgress } from './utils/helper.js';
import { showToast } from './utils/toast.js';
import { StorageService } from './services/storage.service.js';
import { ApiService } from './services/api.service.js';
import { TableView } from './views/table.view.js';
import { GanttView } from './views/gantt.view.js';

class GanttApp {
    constructor() {
        const settings = StorageService.getSettings();
        this.spreadsheetId = settings.spreadsheetId;
        this.gasWebappUrl = settings.gasWebappUrl;

        this.projStartDateStr = '';
        this.projEndDateStr = '';
        this.userCustomDates = false;

        this.tasks = [];
        this.viewScale = 'day';
        this.cellWidth = 36;
        this.rowHeight = 40;
        this.searchTerm = '';
        this.startDate = new Date();
        this.totalDays = 30;

        this.initDOM();
        this.initViews();
        this.bindEvents();
        this.calculateProjectScope();
        this.render();

        if (this.gasWebappUrl) {
            this.fetchFromGoogleSheet(true);
        }
    }

    initDOM() {
        this.dom = {
            leftPane: document.getElementById('left-pane'),
            rightPane: document.getElementById('right-pane'),
            taskTableBody: document.getElementById('task-table-body'),
            timelineMonthHeader: document.getElementById('timeline-month-header'),
            timelineDayHeader: document.getElementById('timeline-day-header'),
            ganttBgGrid: document.getElementById('gantt-bg-grid'),
            ganttBarsContainer: document.getElementById('gantt-bars-container'),
            ganttHeaderContainer: document.getElementById('gantt-header-container'),
            ganttBodyContainer: document.getElementById('gantt-body-container'),
            svgLayer: document.getElementById('gantt-svg-layer'),
            modal: document.getElementById('task-modal'),
            taskForm: document.getElementById('task-form'),
            divider: document.getElementById('drag-divider'),
            kpiTotal: document.getElementById('kpi-total-tasks'),
            kpiProgressBar: document.getElementById('kpi-progress-bar'),
            kpiProgressText: document.getElementById('kpi-progress-text'),
            inputProjStart: document.getElementById('input-proj-start'),
            inputProjEnd: document.getElementById('input-proj-end'),
            gsheetModal: document.getElementById('gsheet-modal'),
            inputGsheetId: document.getElementById('input-gsheet-id'),
            inputGasUrl: document.getElementById('input-gas-url'),
            authModal: document.getElementById('auth-modal'),
            inputVerifyToken: document.getElementById('input-verify-token')
        };
    }

    initViews() {
        this.tableView = new TableView(this.dom.taskTableBody, {
            onUpdateField: (id, field, val) => this.updateTaskField(id, field, val),
            onOpenEditModal: (id) => this.openEditModal(id),
            onLocateTask: (id) => this.locateTask(id)
        });

        this.ganttView = new GanttView({
            timelineMonthHeader: this.dom.timelineMonthHeader,
            timelineDayHeader: this.dom.timelineDayHeader,
            ganttBgGrid: this.dom.ganttBgGrid,
            ganttBarsContainer: this.dom.ganttBarsContainer,
            svgLayer: this.dom.svgLayer
        }, (id) => this.openEditModal(id));
    }

    calculateProjectScope() {
        let minStart = null;
        let maxEnd = null;

        if (this.tasks && this.tasks.length > 0) {
            this.tasks.forEach(t => {
                if (t.start) {
                    const st = parseDate(t.start);
                    if (!isNaN(st.getTime())) {
                        if (!minStart || st < minStart) minStart = st;
                        const dur = parseInt(t.duration) || 1;
                        const end = addDays(st, Math.max(1, dur) - 1);
                        if (!maxEnd || end > maxEnd) maxEnd = end;
                    }
                }
            });
        }

        let pStart = minStart;
        let pEnd = maxEnd;

        if (this.userCustomDates && this.projStartDateStr && this.projEndDateStr) {
            const customStart = parseDate(this.projStartDateStr);
            const customEnd = parseDate(this.projEndDateStr);
            if (!isNaN(customStart.getTime())) pStart = customStart;
            if (!isNaN(customEnd.getTime())) pEnd = customEnd;
        }

        if (!pStart) pStart = new Date();
        if (!pEnd) pEnd = addDays(pStart, 30);
        if (pEnd < pStart) pEnd = addDays(pStart, 30);

        this.startDate = pStart;
        const diffTime = Math.abs(pEnd - pStart);
        this.totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

        if (this.dom.inputProjStart) this.dom.inputProjStart.value = formatDateISO(pStart);
        if (this.dom.inputProjEnd) this.dom.inputProjEnd.value = formatDateISO(pEnd);
    }

    updateKPIs() {
        if (!this.dom.kpiTotal) return;
        this.dom.kpiTotal.textContent = this.tasks.length;

        let totalProgressSum = 0;
        this.tasks.forEach(t => { totalProgressSum += (parseFloat(t.progress) || 0); });
        const avgProgress = this.tasks.length ? Math.round(totalProgressSum / this.tasks.length) : 0;
        this.dom.kpiProgressBar.style.width = `${avgProgress}%`;
        this.dom.kpiProgressText.textContent = `${avgProgress}%`;
    }

    getVisibleTasks() {
        return this.tasks.filter(t => {
            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                const matchName = t.name.toLowerCase().includes(term);
                const matchOwner = (t.owner || '').toLowerCase().includes(term);
                if (!matchName && !matchOwner) return false;
            }
            if (t.parentId !== null) {
                const parent = this.tasks.find(p => p.id === t.parentId);
                if (parent && parent.expanded === false) return false;
            }
            return true;
        });
    }

    render() {
        this.calculateProjectScope();
        this.updateKPIs();
        const visibleTasks = this.getVisibleTasks();

        this.tableView.render(visibleTasks);
        this.ganttView.renderHeadersAndGrid(this.startDate, this.totalDays, this.cellWidth);
        this.ganttView.renderBars(visibleTasks, this.startDate, this.totalDays, this.cellWidth, this.rowHeight);
        this.ganttView.renderDependencies(visibleTasks, this.startDate, this.cellWidth, this.rowHeight);
    }

    updateTaskField(id, field, value) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task[field] = value;
            this.render();
            showToast(`已更新 Task #${id}`);
        }
    }

    locateTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && task.start) {
            const st = parseDate(task.start);
            const offset = diffDays(st, this.startDate);
            if (offset >= 0) {
                this.dom.ganttBodyContainer.scrollLeft = Math.max(0, (offset - 1) * this.cellWidth);
                showToast(`已定位至任務：${task.name}`);
            }
        }
    }

    async fetchFromGoogleSheet(isInitial = false) {
        const gasUrl = this.dom.inputGasUrl ? this.dom.inputGasUrl.value.trim() : this.gasWebappUrl;
        try {
            const resData = await ApiService.fetchFromGoogleSheet(gasUrl);
            if (Array.isArray(resData) && resData.length > 0) {
                this.tasks = resData.map(t => ({
                    ...t,
                    start: formatDateISO(parseDate(t.start)),
                    progress: parseRawProgress(t.progress)
                }));
                this.userCustomDates = false;
                this.projStartDateStr = '';
                this.projEndDateStr = '';
                this.render();
                showToast(`成功載入 ${resData.length} 筆專案任務！`);
            } else if (!isInitial) {
                showToast("試算表目前無任務資料", "info");
            }
        } catch (err) {
            if (!isInitial) showToast(err.message, "error");
        }
    }

    async pushToGoogleSheet(token) {
        const gasUrl = this.dom.inputGasUrl.value.trim() || this.gasWebappUrl;
        try {
            showToast("正在寫入/同步至 Google Sheet...", "info");
            await ApiService.pushToGoogleSheet(gasUrl, token, this.tasks);
            showToast("已成功將甘特圖任務寫入同步至 Google Sheet！");
            this.dom.authModal.classList.add('hidden');
            this.dom.gsheetModal.classList.add('hidden');
        } catch (err) {
            showToast("寫入失敗：" + err.message, "error");
        }
    }

    openCreateModal(isMilestone = false) {
        document.getElementById('modal-title').innerHTML = isMilestone ? '<i class="fa-solid fa-gem text-amber-400"></i> 新增里程碑' : '<i class="fa-solid fa-plus text-brand-400"></i> 新增任務';
        document.getElementById('modal-task-id').value = '';
        document.getElementById('modal-task-name').value = '';
        document.getElementById('modal-task-owner').value = '';
        document.getElementById('modal-task-start').value = this.dom.inputProjStart ? this.dom.inputProjStart.value : formatDateISO(new Date());
        document.getElementById('modal-task-duration').value = isMilestone ? 0 : 5;
        document.getElementById('modal-task-progress').value = 0;
        document.getElementById('modal-task-predecessor').value = '';
        document.getElementById('modal-task-remark').value = '';
        document.getElementById('modal-task-is-milestone').checked = isMilestone;
        document.getElementById('modal-delete-btn').classList.add('hidden');

        this.populateParentSelect();
        this.dom.modal.classList.remove('hidden');
    }

    openEditModal(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-brand-400"></i> 編輯任務細節';
        document.getElementById('modal-task-id').value = task.id;
        document.getElementById('modal-task-name').value = task.name;
        document.getElementById('modal-task-owner').value = task.owner || '';
        document.getElementById('modal-task-start').value = task.start;
        document.getElementById('modal-task-duration').value = task.duration;
        document.getElementById('modal-task-progress').value = task.progress;
        document.getElementById('modal-task-predecessor').value = task.predecessor || '';
        document.getElementById('modal-task-color').value = task.color || 'blue';
        document.getElementById('modal-task-remark').value = task.remark || '';
        document.getElementById('modal-task-is-milestone').checked = !!task.isMilestone;
        document.getElementById('modal-delete-btn').classList.remove('hidden');

        this.populateParentSelect(task.parentId, task.id);
        this.dom.modal.classList.remove('hidden');
    }

    populateParentSelect(currentParentId = null, currentTaskId = null) {
        const select = document.getElementById('modal-task-parent');
        select.innerHTML = '<option value="">無 (最上層父任務)</option>';
        this.tasks.filter(t => t.parentId === null && t.id !== currentTaskId).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            if (p.id === currentParentId) opt.selected = true;
            select.appendChild(opt);
        });
    }

    saveModalForm() {
        const idVal = document.getElementById('modal-task-id').value;
        const parentVal = document.getElementById('modal-task-parent').value;

        const taskData = {
            name: document.getElementById('modal-task-name').value,
            owner: document.getElementById('modal-task-owner').value,
            start: document.getElementById('modal-task-start').value,
            duration: parseInt(document.getElementById('modal-task-duration').value) || 0,
            progress: parseRawProgress(document.getElementById('modal-task-progress').value),
            predecessor: document.getElementById('modal-task-predecessor').value,
            color: document.getElementById('modal-task-color').value,
            remark: document.getElementById('modal-task-remark').value,
            isMilestone: document.getElementById('modal-task-is-milestone').checked,
            parentId: parentVal ? parseInt(parentVal) : null,
            expanded: true
        };

        if (idVal) {
            const id = parseInt(idVal);
            const idx = this.tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
                this.tasks[idx] = { ...this.tasks[idx], ...taskData };
                showToast(`已更新任務: ${taskData.name}`);
            }
        } else {
            const newId = this.tasks.length ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
            this.tasks.push({ id: newId, ...taskData });
            showToast(`已新增任務: ${taskData.name}`);
        }

        this.render();
        this.dom.modal.classList.add('hidden');
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id && t.parentId !== id);
        this.render();
        showToast(`已刪除任務 #${id}`);
    }

    bindEvents() {
        // 同步滾動
        this.dom.taskTableBody.addEventListener('scroll', () => {
            this.dom.ganttBodyContainer.scrollTop = this.dom.taskTableBody.scrollTop;
        });
        this.dom.ganttBodyContainer.addEventListener('scroll', () => {
            this.dom.taskTableBody.scrollTop = this.dom.ganttBodyContainer.scrollTop;
            this.dom.ganttHeaderContainer.scrollLeft = this.dom.ganttBodyContainer.scrollLeft;
        });

        // 搜尋
        document.getElementById('input-search').oninput = (e) => {
            this.searchTerm = e.target.value;
            this.render();
        };

        // 縮放視圖
        document.querySelectorAll('.view-scale-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.view-scale-btn').forEach(b => b.classList.remove('active', 'bg-brand-600', 'text-white'));
                e.target.classList.add('active', 'bg-brand-600', 'text-white');
                this.viewScale = e.target.dataset.scale;
                this.cellWidth = this.viewScale === 'day' ? 36 : this.viewScale === 'week' ? 24 : 14;
                this.render();
            };
        });

        // 折疊與展開
        this.dom.taskTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-toggle-expand');
            if (btn) {
                const id = parseInt(btn.dataset.id);
                const task = this.tasks.find(t => t.id === id);
                if (task) {
                    task.expanded = !task.expanded;
                    this.render();
                }
            }
        });

        document.getElementById('btn-expand-all').onclick = () => {
            this.tasks.forEach(t => t.expanded = true);
            this.render();
        };

        document.getElementById('btn-collapse-all').onclick = () => {
            this.tasks.forEach(t => t.expanded = false);
            this.render();
        };

        document.getElementById('btn-today').onclick = () => {
            const today = new Date();
            const diffDaysVal = diffDays(today, this.startDate);
            this.dom.ganttBodyContainer.scrollLeft = Math.max(0, (diffDaysVal - 3) * this.cellWidth);
        };

        // 新增任務 / 里程碑
        document.getElementById('btn-add-task').onclick = () => this.openCreateModal(false);
        document.getElementById('btn-add-milestone').onclick = () => this.openCreateModal(true);

        // 自訂日期範圍與自動貼合
        if (this.dom.inputProjStart) {
            this.dom.inputProjStart.onchange = (e) => {
                if (e.target.value) {
                    this.projStartDateStr = e.target.value;
                    this.userCustomDates = true;
                    this.render();
                }
            };
        }

        if (this.dom.inputProjEnd) {
            this.dom.inputProjEnd.onchange = (e) => {
                if (e.target.value) {
                    this.projEndDateStr = e.target.value;
                    this.userCustomDates = true;
                    this.render();
                }
            };
        }

        const btnAutofit = document.getElementById('btn-autofit-dates');
        if (btnAutofit) {
            btnAutofit.onclick = () => {
                this.userCustomDates = false;
                this.projStartDateStr = '';
                this.projEndDateStr = '';
                this.render();
                showToast("已自動抓取任務起止日！");
            };
        }

        // 匯出 / 匯入 JSON
        document.getElementById('btn-export-json').onclick = () => {
            StorageService.exportJSON(this.tasks, `gantt_project_${formatDateISO(new Date())}.json`);
            showToast("已成功匯出 JSON 專案資料！");
        };

        document.getElementById('file-import').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const imported = JSON.parse(evt.target.result);
                    if (Array.isArray(imported)) {
                        this.tasks = imported.map(t => ({
                            ...t,
                            progress: parseRawProgress(t.progress)
                        }));
                        this.render();
                        showToast("專案 JSON 匯入成功！");
                    }
                } catch (err) {
                    showToast("匯入失敗：格式不正確", "error");
                }
            };
            reader.readAsText(file);
        };

        document.getElementById('btn-reset-demo').onclick = () => {
            this.tasks = [];
            this.render();
            showToast("已清空列表");
        };

        document.getElementById('btn-print').onclick = () => window.print();

        // 彈窗與後端連線
        document.getElementById('btn-gsheet-sync').onclick = () => {
            this.dom.inputGsheetId.value = this.spreadsheetId;
            this.dom.inputGasUrl.value = this.gasWebappUrl;
            this.dom.gsheetModal.classList.remove('hidden');
        };

        document.getElementById('gsheet-modal-close').onclick = () => this.dom.gsheetModal.classList.add('hidden');

        document.getElementById('btn-fetch-gsheet').onclick = () => {
            this.spreadsheetId = this.dom.inputGsheetId.value.trim();
            this.gasWebappUrl = this.dom.inputGasUrl.value.trim();
            StorageService.saveSettings(this.spreadsheetId, this.gasWebappUrl);
            this.fetchFromGoogleSheet();
        };

        document.getElementById('btn-trigger-token-prompt').onclick = () => {
            this.dom.inputVerifyToken.value = '';
            this.dom.authModal.classList.remove('hidden');
        };

        document.getElementById('auth-modal-close').onclick = () => this.dom.authModal.classList.add('hidden');
        document.getElementById('btn-auth-cancel').onclick = () => this.dom.authModal.classList.add('hidden');

        document.getElementById('btn-auth-confirm').onclick = () => {
            const token = this.dom.inputVerifyToken.value.trim();
            if (!token) {
                showToast("請輸入授權密鑰！", "error");
                return;
            }
            this.pushToGoogleSheet(token);
        };

        document.getElementById('modal-close').onclick = () => this.dom.modal.classList.add('hidden');
        document.getElementById('modal-cancel-btn').onclick = () => this.dom.modal.classList.add('hidden');
        this.dom.taskForm.onsubmit = (e) => {
            e.preventDefault();
            this.saveModalForm();
        };

        document.getElementById('modal-delete-btn').onclick = () => {
            const id = parseInt(document.getElementById('modal-task-id').value);
            if (id) {
                this.deleteTask(id);
                this.dom.modal.classList.add('hidden');
            }
        };

        // 左右拖曳寬度調節
        let isDragging = false;
        this.dom.divider.onmousedown = () => { isDragging = true; };
        document.onmousemove = (e) => {
            if (!isDragging) return;
            const rect = document.getElementById('gantt-workspace').getBoundingClientRect();
            const width = e.clientX - rect.left;
            if (width > 250 && width < 700) {
                this.dom.leftPane.style.width = `${width}px`;
            }
        };
        document.onmouseup = () => { isDragging = false; };
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new GanttApp();
});
