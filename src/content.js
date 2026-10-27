// Site copy, migrated from the original index.html. Edit text here.
export default {
 "features": [
  {
   "icon": "i-ticket",
   "title": "Incident and ticket management",
   "text": "Raise incidents and service requests with category, impact, urgency and attachments. Move them through a validated status flow with a complete history.",
   "use": "Use case: a laptop will not boot, so the employee reports it in one form."
  },
  {
   "icon": "i-assign",
   "title": "Assign, accept and reassign",
   "text": "Assign to any active colleague or team. Assignees accept or decline with a reason, post progress updates with a percentage, and can reassign with a reason. The ticket ID never changes.",
   "use": "Use case: IT hands a password request to the right colleague."
  },
  {
   "icon": "i-clock",
   "title": "SLA tracking",
   "text": "Define first-response and resolution targets per priority, optionally per category. Overdue and time-remaining are calculated from real timestamps.",
   "use": "Use case: spot critical tickets that are about to breach."
  },
  {
   "icon": "i-star",
   "title": "Workspace, favourites and watchers",
   "text": "See every ticket you raised, work on or follow in one workspace. Star tickets, and add read-only watchers who are notified of replies and status changes.",
   "use": "Use case: a manager follows a payroll issue without owning it."
  },
  {
   "icon": "i-chart",
   "title": "Dashboards and reports",
   "text": "Role-specific dashboards show open tickets, workload, SLA compliance and recent activity. Reports can be exported as CSV.",
   "use": "Use case: review last month’s tickets by category."
  },
  {
   "icon": "i-board",
   "title": "Projects and visual task boards",
   "text": "Plan projects and tasks on boards, link tickets to projects, and keep deadlines visible with task reminders.",
   "use": "Use case: an office-move project with tasks and linked tickets."
  },
  {
   "icon": "i-calendar",
   "title": "Leave and employee requests",
   "text": "Employees submit and cancel leave and other requests. Approvals follow role rules, and nobody approves their own request.",
   "use": "Use case: HR approves a leave request from the same inbox."
  },
  {
   "icon": "i-chat",
   "title": "Built-in chat",
   "text": "Direct messages, a company-wide #general channel and group chats created by HR or admins, stored in your own database.",
   "use": "Use case: ask a colleague a quick question without leaving the app."
  },
  {
   "icon": "i-book",
   "title": "Employee centre and knowledge",
   "text": "A self-service landing page with a service catalogue, your own tickets and knowledge articles that answer common questions.",
   "use": "Use case: an employee finds how to request leave before asking HR."
  },
  {
   "icon": "i-bell",
   "title": "Notifications",
   "text": "In-app notifications for assignments, replies and status changes. Email delivery is optional and is switched on by configuring SMTP.",
   "use": "Use case: the requester is told when their ticket is resolved."
  },
  {
   "icon": "i-log",
   "title": "Activity log",
   "text": "An audit trail of sign-ins and changes to tickets, requests, tasks and projects, scoped to what each role is allowed to see.",
   "use": "Use case: answer \"who changed this and when?\"."
  },
  {
   "icon": "i-gear",
   "title": "Administrator configuration",
   "text": "Admins manage users, roles, departments, categories, assignment rules, SLA policies and email settings from one configuration area.",
   "use": "Use case: route every network ticket to the infrastructure team."
  }
 ],
 "roles": [
  {
   "icon": "i-shield",
   "title": "Administrator",
   "text": "Sees every ticket, assigns and escalates work, manages users, categories, assignment rules and SLA policies, and exports reports."
  },
  {
   "icon": "i-assign",
   "title": "HR",
   "text": "Works the requests that belong to HR, handles leave and employee requests, and can set up group chats for teams."
  },
  {
   "icon": "i-ticket",
   "title": "Employee",
   "text": "Raises incidents and requests, follows their own tickets, replies to support, and uses the employee centre and chat."
  }
 ],
 "solutions": [
  {
   "title": "Internal IT helpdesk",
   "text": "Hardware, network, access and software issues land in one queue, with owners, priorities and SLA clocks."
  },
  {
   "title": "HR and employee services",
   "text": "Leave, payroll questions and employee requests go to HR with clear approval rules and a visible history."
  },
  {
   "title": "Incident tracking",
   "text": "Escalate serious issues to an administrator, keep internal notes private and review everything that happened afterwards."
  },
  {
   "title": "Project-linked support",
   "text": "Relate tickets to projects and track the tasks behind them on a board."
  }
 ],
 "solutionsNote": "Small teams can run it as a simple shared inbox. Growing teams add categories, assignment rules and SLA policies. Larger organisations separate Admin, HR and Employee responsibilities. Barid-IN does not currently include third-party integrations or business-hours SLA calendars.",
 "steps": [
  {
   "title": "Raise",
   "text": "An employee reports an incident or submits a request. The ticket gets a reference ID such as BI-T16ID24."
  },
  {
   "title": "Review and assign",
   "text": "Staff review the ticket and assign it to a person or team, or a category rule does it automatically."
  },
  {
   "title": "Accept and work",
   "text": "The assignee accepts, replies to the requester and posts progress updates."
  },
  {
   "title": "Resolve and close",
   "text": "The ticket moves through In Progress, Pending and Resolved. The requester confirms and closes it, or reopens it."
  }
 ],
 "statuses": [
  "New",
  "Open",
  "Assigned",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed"
 ],
 "gallery": [
  {
   "src": "/img/dashboard.webp",
   "caption": "Admin dashboard: counts, 14-day trend, status and priority.",
   "alt": "Admin dashboard",
   "label": "Admin dashboard"
  },
  {
   "src": "/img/board.webp",
   "caption": "Ticket board grouped by status.",
   "alt": "Ticket board",
   "label": "Ticket board"
  },
  {
   "src": "/img/new-incident.webp",
   "caption": "Raising an incident.",
   "alt": "New incident form",
   "label": "Report an incident"
  },
  {
   "src": "/img/ticket-detail.webp",
   "caption": "Ticket detail with status flow, SLA timer, conversation and actions.",
   "alt": "Ticket detail",
   "label": "Ticket detail and actions"
  },
  {
   "src": "/img/accept-ticket.webp",
   "caption": "Assignees accept or decline a ticket assigned to them.",
   "alt": "Accept ticket banner",
   "label": "Accept or decline"
  },
  {
   "src": "/img/starred.webp",
   "caption": "Starred tickets under Favourites.",
   "alt": "Starred tickets",
   "label": "Favourites"
  },
  {
   "src": "/img/employee-centre.webp",
   "caption": "Employee centre with quick actions and latest knowledge articles.",
   "alt": "Employee centre",
   "label": "Employee centre"
  },
  {
   "src": "/img/leave.webp",
   "caption": "Submitting a leave request.",
   "alt": "Leave request form",
   "label": "Leave request"
  },
  {
   "src": "/img/people.webp",
   "caption": "A person’s profile with assigned tickets, projects, tasks and recent activity.",
   "alt": "Person profile",
   "label": "People and profiles"
  }
 ],
 "security": [
  {
   "icon": "i-lock",
   "title": "Authentication",
   "text": "Passwords are stored as bcrypt hashes. Sessions use signed tokens that expire (8 hours by default), and repeated failed sign-ins are throttled."
  },
  {
   "icon": "i-shield",
   "title": "Role-based access",
   "text": "Admin, HR and Employee permissions are checked on the server for every request. Internal notes are never visible to employees."
  },
  {
   "icon": "i-folder",
   "title": "Attachments",
   "text": "Files are stored outside the web root with random names and served only after a permission check. Executables, scripts, HTML and SVG uploads are refused."
  },
  {
   "icon": "i-log",
   "title": "Audit trail",
   "text": "Sign-ins and changes are recorded, and every ticket stores who changed what, when, from which value to which."
  },
  {
   "icon": "i-gear",
   "title": "Secrets and validation",
   "text": "Secrets such as the JWT key and SMTP password live in server environment variables. API input is validated on the server and security headers are applied."
  },
  {
   "icon": "i-play",
   "title": "This website’s demo",
   "text": "The demo videos are served only to registered visitors for a limited session. No real customer data appears in them. Your details are stored only to follow up with you."
  }
 ],
 "securityIntro": "Described from the application’s code. Barid-IN does not currently claim any compliance certification.",
 "faq": [
  {
   "q": "How do I try Barid-IN?",
   "a": "Select Try Live Demo, enter your name, email and organisation, and you go straight to the product. Nothing to install or buy."
  },
  {
   "q": "Who can see which tickets?",
   "a": "Employees see their own tickets and tickets assigned to them. HR and administrators see more, according to their role. Internal notes are never shown to requesters."
  },
  {
   "q": "Does Barid-IN send email notifications?",
   "a": "In-app notifications are always on. Email is optional and is switched on by an administrator configuring SMTP."
  },
  {
   "q": "Does it integrate with other tools?",
   "a": "Not at the moment. Barid-IN is a self-contained helpdesk with its own tickets, projects, requests and chat."
  },
  {
   "q": "What does it cost?",
   "a": "Pricing has not been published yet. Send us a message and we will get back to you."
  }
 ],
 "tabs": [
  {
   "label": "Dashboard",
   "img": "dashboard",
   "title": "Company health at a glance",
   "text": "Open tickets, unassigned work, overdue items, SLA compliance and a 14-day trend on one screen.",
   "list": [
    "Open tickets by status and priority",
    "Workload and recent activity",
    "Role-specific dashboards"
   ]
  },
  {
   "label": "Tickets",
   "img": "board",
   "title": "Board and list views",
   "text": "Move between a status board and a sortable list, and jump into saved queues such as Unassigned or SLA breached.",
   "list": [
    "Filter by status, priority, category and date",
    "Overdue time shown on every card",
    "Star tickets to find them later"
   ]
  },
  {
   "label": "Workflow",
   "img": "ticket-detail",
   "title": "One page per ticket",
   "text": "Status flow, SLA timer, conversation and actions together: reply, reassign, set pending, resolve or escalate.",
   "list": [
    "Public replies and internal notes",
    "Assignees accept or decline with a reason",
    "Full history of who changed what"
   ]
  },
  {
   "label": "Employee centre",
   "img": "employee-centre",
   "title": "Self-service for employees",
   "text": "Request a service, check leave and requests, message HR and read knowledge articles before raising a ticket.",
   "list": [
    "Quick actions for common needs",
    "Your recent tickets in one place",
    "Knowledge articles for common questions"
   ]
  },
  {
   "label": "People",
   "img": "people",
   "title": "People, projects and tasks",
   "text": "Each profile shows assigned tickets, projects, tasks and recent activity.",
   "list": [
    "Departments and roles",
    "Projects linked to tickets",
    "Task boards with deadlines"
   ]
  }
 ],
 "clips": [
  {
   "file": "ticket-raising.mp4",
   "title": "Ticket raising: full recording",
   "desc": "Raise an incident, reply, accept, update progress."
  },
  {
   "file": "navigation-menu.mp4",
   "title": "Menu and service catalogue",
   "desc": "Find the service catalogue, employee centre and reports."
  },
  {
   "file": "leave-requests.mp4",
   "title": "Leave and requests",
   "desc": "Submit a leave request and follow it."
  },
  {
   "file": "visual-taskboard.mp4",
   "title": "Visual task boards",
   "desc": "Work with boards and tasks."
  },
  {
   "file": "projects.mp4",
   "title": "Projects",
   "desc": "Projects with their tasks and linked tickets."
  },
  {
   "file": "people-management.mp4",
   "title": "People and chat",
   "desc": "People directory, profiles and messages."
  }
 ],
 "heads": {
  "product": [
   "One place for every support request",
   "Employees raise incidents and requests. HR and IT teams review, assign and resolve them. Administrators see the whole picture on a live dashboard."
  ],
  "roles": [
   "The right view for every person",
   "Permissions are checked on the server, so each role only sees and does what it should."
  ],
  "features": [
   "Everything a support team needs, nothing it does not",
   "Each capability below exists in the application today."
  ],
  "solutions": [
   "Built for internal service teams",
   "Barid-IN is designed for employees asking their own organisation for help."
  ],
  "screens": [
   "See the real screens",
   "Screenshots captured from the running application with sample data. Select an image to enlarge it."
  ]
 },
 "legal": {"privacy":{"title":"Privacy policy","note":"Draft for legal review. This page describes what this website actually does today. It must be reviewed and completed by the operating company (legal entity name, address, contact and applicable law) before public launch.","blocks":[["What we collect","When you unlock the demo we store the name, work email, organisation, role and interest you enter, the time of your visit, a shortened one-way hash of your IP address, and your browser user-agent. When you use the contact form we store the details and message you send."],["Why","To give you access to the product demo and to follow up about Barid-IN, as you agreed when you ticked the consent box."],["Cookies","We set one strictly necessary, HttpOnly cookie (bi_demo) that proves you registered and expires automatically. We do not use advertising or analytics cookies."],["Sharing and retention","We do not sell your details. Retention period, processors and international transfers: to be completed by the operating company."],["Your rights","You can ask us to access, correct or delete your details by writing to the contact address published on the website. Contact address to be completed."]]},"terms":{"title":"Terms of service","note":"Draft for legal review. Placeholder terms covering the demo and website only. They must be reviewed by a qualified professional before launch.","blocks":[["Demo access","Demo recordings and any demo workspace are provided for evaluation only, with fictional sample data. You may not download, copy, record, redistribute or reverse-engineer them, or attempt to access other users data or administrative functions."],["No warranty","The demo and this website are provided as is. Features shown may change."],["Accounts and software terms","Commercial terms, pricing, support and service levels for the Barid-IN software have not been published. To be completed by the operating company."]]}}
};
