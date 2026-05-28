# Berimbolo Security - Frontend

Монгол хэл дээрх аюулгүй байдлын системийн веб интерфейс.

## 🚀 Суулгах

```bash
cd frontend
npm install
npm run dev
```

## 📁 Бүтэц

```
frontend/
├── src/
│   ├── api/
│   │   └── api.js          # API client (Axios)
│   ├── components/         # React components
│   ├── pages/
│   │   ├── Dashboard.jsx   # Үндсэн самбар
│   │   ├── Appointments.jsx # Уулзалтууд
│   │   ├── JobTickets.jsx  # Ажлын даалгавар
│   │   ├── Devices.jsx     # IoT төхөөрөмжүүд
│   │   └── Telemetry.jsx   # Телеметр өгөгдөл
│   ├── App.jsx             # Үндсэн app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## 🌐 Хуудсууд

### 1. Үндсэн самбар (Dashboard)
- Статистик мэдээлэл
- Сүүлийн уулзалтууд
- Сүүлийн дохиоллууд

### 2. Уулзалтууд (Appointments)
- Шинэ уулзалт үүсгэх
- Уулзалтыг засварлах/устгах
- Инженерийн чөлөөт цагийг шалгах

### 3. Ажлын даалгавар (Job Tickets)
- Ажлын төлөвийг шинэчлэх
- Сэлбэг хэрэгсэл захиалах
- Ажлын явцыг хянах

### 4. Төхөөрөмжүүд (Devices)
- IoT төхөөрөмж нэмэх
- Төхөөрөмжийн жагсаалт
- Идэвхтэй байдлыг хянах

### 5. Телеметр (Telemetry)
- IoT төхөөрөмжөөс ирсэн дохио
- Үйл явдлын төрлүүд
- Яаралтай дохиоллууд

## 🔧 Технолог

- **React 18** - UI framework
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **CSS3** - Styling

## 🔌 Backend холболт

Frontend нь backend сервертэй (`http://localhost:5000`) дараах API-гаар холбогдоно:

- `/api/appointments` - Уулзалтууд
- `/api/job-tickets` - Ажлын даалгавар
- `/api/devices` - Төхөөрөмжүүд
- `/api/telemetry` - Телеметр өгөгдөл

Vite конфигурацид proxy тохиргоо хийгдсэн тул development үед `/api` руу хийсэн хүсэлтүүд автоматаар backend рүү дамжина.

## 📝 Дээш татах

```bash
npm run build
```

Build хийсний дараа `dist/` хавтас үүснэ. Үүнийг production сервер дээр байршуулна.
