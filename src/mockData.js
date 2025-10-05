// src/mockData.js

const mockTrees = [
  {
    id: 1,
    tree_number: "001",
    tree_name: "Redwood #1",
    species: "Sequoia sempervirens",
    date_acquired: "2022-05-10",
    origin_date: "2015-04-01",
    current_girth: 20.5,
    notes: "Repotted spring 2024",
    photos: [
      {
        id: 1,
        file_path: "/images/redwood1-2023-04.jpg",
        photo_date: "2023-04-12",
        description: "Early spring growth",
        is_starred: 1,
      },
    ],
    updates: [
      {
        id: 1,
        update_date: "2024-03-10",
        girth: 21.0,
        work_performed: "Spring pruning",
      },
    ],
    reminders: [
      {
        id: 1,
        reminder_date: "2025-04-15",
        message: "Check for root growth",
        is_completed: 0,
      },
    ],
  },
  {
    id: 2,
    tree_number: "002",
    tree_name: "Maple #1",
    species: "Acer palmatum",
    date_acquired: "2023-08-01",
    origin_date: "2020-04-01",
    current_girth: 10.2,
    notes: "Developing branch structure",
    photos: [
      {
        id: 2,
        file_path: "/images/maple1-2023-08.jpg",
        photo_date: "2023-08-15",
        description: "Summer foliage",
        is_starred: 0,
      },
    ],
    updates: [
      {
        id: 2,
        update_date: "2023-09-10",
        girth: 10.5,
        work_performed: "Wiring primary branches",
      },
    ],
    reminders: [
      {
        id: 2,
        reminder_date: "2025-05-01",
        message: "Repot into larger container",
        is_completed: 0,
      },
    ],
  },
];

export default mockTrees;
