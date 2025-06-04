class TaskManager {
    constructor() {
        this.tasks = [];
        this.members = [];
        this.currentTaskId = 1;
        this.statusChart = null;
        this.priorityChart = null;
        this.initializeEventListeners();
        this.loadFromLocalStorage();
        this.render();
        this.updateDashboard();
        this.initializeCharts();
    }

    initializeEventListeners() {
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        document.getElementById('add-member').addEventListener('click', () => {
            this.addMember();
        });

        document.getElementById('filter-status').addEventListener('change', () => this.render());
        document.getElementById('filter-priority').addEventListener('change', () => this.render());
        document.getElementById('filter-assignee').addEventListener('change', () => this.render());
        document.getElementById('search-task').addEventListener('input', () => this.render());
    }

    addTask() {
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const priority = document.getElementById('task-priority').value;
        const dueDate = document.getElementById('task-due-date').value;
        const assignee = document.getElementById('task-assignee').value;

        const task = {
            id: this.currentTaskId++,
            title,
            description,
            priority,
            dueDate,
            assignee,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveToLocalStorage();
        this.render();
        this.updateDashboard();
        this.updateCharts();
        this.clearTaskForm();
    }

    clearTaskForm() {
        document.getElementById('task-form').reset();
    }

    addMember() {
        const memberName = document.getElementById('member-name').value.trim();
        if (memberName && !this.members.includes(memberName)) {
            this.members.push(memberName);
            this.saveToLocalStorage();
            this.renderMembers();
            this.updateAssigneeDropdowns();
            this.updateDashboard();
            document.getElementById('member-name').value = '';
        }
    }

    removeMember(memberName) {
        this.members = this.members.filter(m => m !== memberName);
        this.tasks.forEach(task => {
            if (task.assignee === memberName) {
                task.assignee = '';
            }
        });
        this.saveToLocalStorage();
        this.renderMembers();
        this.updateAssigneeDropdowns();
        this.render();
        this.updateDashboard();
    }

    updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            this.saveToLocalStorage();
            this.render();
            this.updateDashboard();
            this.updateCharts();
        }
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveToLocalStorage();
        this.render();
        this.updateDashboard();
        this.updateCharts();
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-due-date').value = task.dueDate;
            document.getElementById('task-assignee').value = task.assignee;
            
            this.deleteTask(taskId);
        }
    }

    getFilteredTasks() {
        let filtered = [...this.tasks];
        
        const statusFilter = document.getElementById('filter-status').value;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }
        
        const priorityFilter = document.getElementById('filter-priority').value;
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(t => t.priority === priorityFilter);
        }
        
        const assigneeFilter = document.getElementById('filter-assignee').value;
        if (assigneeFilter !== 'all') {
            filtered = filtered.filter(t => t.assignee === assigneeFilter);
        }
        
        const searchTerm = document.getElementById('search-task').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(searchTerm) ||
                t.description.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }

    render() {
        const taskList = document.getElementById('task-list');
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<p class="no-tasks">タスクがありません</p>';
            return;
        }
        
        taskList.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.status}" data-priority="${task.priority}">
                <div class="task-header">
                    <h3>${this.escapeHtml(task.title)}</h3>
                    <div class="task-actions">
                        <button onclick="taskManager.editTask(${task.id})" class="edit-btn"><i class="fas fa-edit"></i> 編集</button>
                        <button onclick="taskManager.deleteTask(${task.id})" class="delete-btn"><i class="fas fa-trash"></i> 削除</button>
                    </div>
                </div>
                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="priority ${task.priority}">優先度: ${this.getPriorityLabel(task.priority)}</span>
                    ${task.dueDate ? `<span class="due-date">期限: ${new Date(task.dueDate).toLocaleDateString('ja-JP')}</span>` : ''}
                    ${task.assignee ? `<span class="assignee">担当: ${this.escapeHtml(task.assignee)}</span>` : ''}
                </div>
                <div class="task-status">
                    <select onchange="taskManager.updateTaskStatus(${task.id}, this.value)" value="${task.status}">
                        <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>未完了</option>
                        <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>進行中</option>
                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>完了</option>
                    </select>
                </div>
            </div>
        `).join('');
    }

    renderMembers() {
        const memberList = document.getElementById('member-list');
        memberList.innerHTML = this.members.map(member => `
            <li>
                ${this.escapeHtml(member)}
                <button onclick="taskManager.removeMember('${this.escapeHtml(member)}')" class="remove-member"><i class="fas fa-user-minus"></i> 削除</button>
            </li>
        `).join('');
    }

    updateAssigneeDropdowns() {
        const assigneeSelects = [
            document.getElementById('task-assignee'),
            document.getElementById('filter-assignee')
        ];
        
        assigneeSelects.forEach(select => {
            const currentValue = select.value;
            if (select.id === 'task-assignee') {
                select.innerHTML = '<option value="">担当者を選択</option>';
            } else {
                select.innerHTML = '<option value="all">すべての担当者</option>';
            }
            
            this.members.forEach(member => {
                const option = document.createElement('option');
                option.value = member;
                option.textContent = member;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        });
    }

    getPriorityLabel(priority) {
        const labels = {
            high: '高',
            medium: '中',
            low: '低'
        };
        return labels[priority] || priority;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveToLocalStorage() {
        localStorage.setItem('taskManagerData', JSON.stringify({
            tasks: this.tasks,
            members: this.members,
            currentTaskId: this.currentTaskId
        }));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('taskManagerData');
        if (saved) {
            const data = JSON.parse(saved);
            this.tasks = data.tasks || [];
            this.members = data.members || [];
            this.currentTaskId = data.currentTaskId || 1;
            this.renderMembers();
            this.updateAssigneeDropdowns();
        }
    }

    updateDashboard() {
        const totalTasks = this.tasks.length;
        const pendingTasks = this.tasks.filter(t => t.status === 'pending').length;
        const inProgressTasks = this.tasks.filter(t => t.status === 'in-progress').length;
        const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
        const totalMembers = this.members.length;

        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('in-progress-tasks').textContent = inProgressTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('team-members').textContent = totalMembers;
    }

    initializeCharts() {
        const statusCtx = document.getElementById('status-chart').getContext('2d');
        const priorityCtx = document.getElementById('priority-chart').getContext('2d');

        this.statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['未完了', '進行中', '完了'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#718096',
                        '#f6ad55',
                        '#48bb78'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    title: {
                        display: true,
                        text: 'タスクステータス'
                    }
                }
            }
        });

        this.priorityChart = new Chart(priorityCtx, {
            type: 'bar',
            data: {
                labels: ['高', '中', '低'],
                datasets: [{
                    label: 'タスク数',
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#fc8181',
                        '#f6ad55',
                        '#667eea'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '優先度別タスク'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        this.updateCharts();
    }

    updateCharts() {
        if (!this.statusChart || !this.priorityChart) return;

        const pendingCount = this.tasks.filter(t => t.status === 'pending').length;
        const inProgressCount = this.tasks.filter(t => t.status === 'in-progress').length;
        const completedCount = this.tasks.filter(t => t.status === 'completed').length;

        this.statusChart.data.datasets[0].data = [pendingCount, inProgressCount, completedCount];
        this.statusChart.update();

        const highCount = this.tasks.filter(t => t.priority === 'high').length;
        const mediumCount = this.tasks.filter(t => t.priority === 'medium').length;
        const lowCount = this.tasks.filter(t => t.priority === 'low').length;

        this.priorityChart.data.datasets[0].data = [highCount, mediumCount, lowCount];
        this.priorityChart.update();
    }
}

const taskManager = new TaskManager();