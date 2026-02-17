export const STATUS = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved"
};

export const dummyComplaints = [
    {
        id: "CMP-2023001",
        category: "Road Damage",
        description: "Large pothole on Main Street near the post office.",
        date: "2023-10-25",
        status: STATUS.PENDING,
        location: "Main Street, Sector 4",
        citizenName: "John Doe",
        assignedOfficer: null,
        statusClass: "badge-pending"
    },
    {
        id: "CMP-2023002",
        category: "Garbage",
        description: "Overflowing dumpster in the park.",
        date: "2023-10-24",
        status: STATUS.IN_PROGRESS,
        location: "Central Park",
        citizenName: "Jane Smith",
        assignedOfficer: "Officer Raj",
        statusClass: "badge-progress"
    },
    {
        id: "CMP-2023003",
        category: "Street Light",
        description: "Street light flickering constantly.",
        date: "2023-10-20",
        status: STATUS.RESOLVED,
        location: "Avenue 5",
        citizenName: "John Doe",
        assignedOfficer: "Officer Priya",
        statusClass: "badge-resolved"
    }
];
