import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { getAllDoctorsForBooking, getMyPatientProfile } from "../features/user/patientApi";
import { getAllMedicalServices } from "../features/user/medicalServiceApi";
import {
    bookMyAppointment,
    getDoctorScheduledAppointmentsForDate,
    getPatientAppointmentsHistory,
    getPatientUpcomingAppointments,
} from "../features/user/appointmentApi";
import { extractApiErrorMessage } from "../utils/errors";
import { formatTimeHHmm } from "../utils/dateTime";
import { sortAppointmentsByDateTime, filterAppointmentsByStatus } from "../utils/appointments";
import { getDefaultAppointmentBookingForm } from "../utils/forms";

const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 20;

function getTomorrowDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function createHalfHourSlots() {
    const slots = [];

    for (let hour = SLOT_START_HOUR; hour <= SLOT_END_HOUR; hour += 1) {
        slots.push(`${String(hour).padStart(2, "0")}:00`);
        if (hour !== SLOT_END_HOUR) {
            slots.push(`${String(hour).padStart(2, "0")}:30`);
        }
    }

    return slots;
}

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

function overlaps(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}

const HALF_HOUR_SLOTS = createHalfHourSlots();

function PatientAppointmentsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [needsProfile, setNeedsProfile] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [doctors, setDoctors] = useState([]);
    const [services, setServices] = useState([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [historyAppointments, setHistoryAppointments] = useState([]);
    const [doctorAppointmentsForDate, setDoctorAppointmentsForDate] = useState([]);

    const [form, setForm] = useState({
        ...getDefaultAppointmentBookingForm(),
        appointmentDate: getTomorrowDate(),
    });

	const [viewDate, setViewDate] = useState(getTomorrowDate());
	const [doctorAppointmentsForViewDate, setDoctorAppointmentsForViewDate] = useState([]);

    const loadPageData = async () => {
        setLoading(true);
        setError("");

        try {
            await getMyPatientProfile();
            setNeedsProfile(false);

            const [doctorsData, servicesData, upcomingData, historyData] = await Promise.all([
                getAllDoctorsForBooking(),
                getAllMedicalServices(),
                getPatientUpcomingAppointments(),
                getPatientAppointmentsHistory(),
            ]);

            setDoctors(doctorsData);
            setServices(servicesData);
            setUpcomingAppointments(upcomingData);
            setHistoryAppointments(historyData);
        } catch (err) {
            if (err.response?.status === 404) {
                setNeedsProfile(true);
            } else {
                setError(extractApiErrorMessage(err));
            }
        } finally {
            setLoading(false);
        }
    };

    const loadDoctorAvailability = async (doctorId, date) => {
        if (!doctorId || !date) {
            setDoctorAppointmentsForDate([]);
            return;
        }

        setAvailabilityLoading(true);
        setError("");

        try {
            const data = await getDoctorScheduledAppointmentsForDate(doctorId, date);
            setDoctorAppointmentsForDate(data);
        } catch (err) {
            setError(extractApiErrorMessage(err));
            setDoctorAppointmentsForDate([]);
        } finally {
            setAvailabilityLoading(false);
        }
    };

    useEffect(() => {
        loadPageData();
    }, []);

    useEffect(() => {
        loadDoctorAvailability(form.doctorId, form.appointmentDate);
    }, [form.doctorId, form.appointmentDate]);

	useEffect(() => {
		const loadViewDoctorAvailability = async () => {
			if (!form.doctorId || !viewDate) {
				setDoctorAppointmentsForViewDate([]);
				return;
			}

			try {
				const data = await getDoctorScheduledAppointmentsForDate(form.doctorId, viewDate);
				setDoctorAppointmentsForViewDate(data);
			} catch {
				setDoctorAppointmentsForViewDate([]);
			}
		};

		loadViewDoctorAvailability();
	}, [form.doctorId, viewDate]);


    const selectedDateAppointments = useMemo(() => {
		const all = [...upcomingAppointments, ...historyAppointments];
		return sortAppointmentsByDateTime(
            all.filter((a) => a.appointmentDate === viewDate)
        );
	}, [upcomingAppointments, historyAppointments, viewDate]);

    const serviceDurationById = useMemo(() => {
        const map = {};
        services.forEach((s) => {
            map[s.id] = s.duration;
        });
        return map;
    }, [services]);

    const selectedServiceDuration = useMemo(() => {
        if (!form.serviceId) return 30;
        return serviceDurationById[Number(form.serviceId)] || 30;
    }, [form.serviceId, serviceDurationById]);

    const viewPatientBusyIntervals = useMemo(() => {
        return filterAppointmentsByStatus(
            upcomingAppointments.filter((a) => a.appointmentDate === viewDate),
            "SCHEDULED"
        )
            .map((a) => {
                const start = toMinutes(formatTimeHHmm(a.appointmentTime, ""));
                const duration = serviceDurationById[a.serviceId] || 30;
                return { start, end: start + duration };
            });
    }, [upcomingAppointments, viewDate, serviceDurationById]);

    const viewDoctorBusyIntervals = useMemo(() => {
        return filterAppointmentsByStatus(doctorAppointmentsForViewDate, "SCHEDULED")
            .map((a) => {
                const start = toMinutes(formatTimeHHmm(a.appointmentTime, ""));
                const duration = serviceDurationById[a.serviceId] || 30;
                return { start, end: start + duration };
            });
    }, [doctorAppointmentsForViewDate, serviceDurationById]);

    const viewBlockedSlots = useMemo(() => {
        const map = {};
        const viewSelectedServiceDuration = form.serviceId ? (serviceDurationById[Number(form.serviceId)] || 30) : 30;

        HALF_HOUR_SLOTS.forEach((slot) => {
            const reasons = [];
            const slotStart = toMinutes(slot);
            const slotEnd = slotStart + viewSelectedServiceDuration;

            const patientOverlap = viewPatientBusyIntervals.some((i) => overlaps(slotStart, slotEnd, i.start, i.end));
            const doctorOverlap = form.doctorId
                ? viewDoctorBusyIntervals.some((i) => overlaps(slotStart, slotEnd, i.start, i.end))
                : false;

            if (patientOverlap) reasons.push("You already have an appointment");
            if (doctorOverlap) reasons.push("Doctor is not available");

            map[slot] = reasons;
        });

        return map;
    }, [viewPatientBusyIntervals, viewDoctorBusyIntervals, form.doctorId, form.serviceId, serviceDurationById]);

    const patientBusyIntervals = useMemo(() => {
        return filterAppointmentsByStatus(
            upcomingAppointments.filter((a) => a.appointmentDate === form.appointmentDate),
            "SCHEDULED"
        )
            .map((a) => {
                const start = toMinutes(formatTimeHHmm(a.appointmentTime, ""));
                const duration = serviceDurationById[a.serviceId] || 30;
                return {
                    start,
                    end: start + duration,
                    reason: "You already have an appointment",
                };
            });
    }, [upcomingAppointments, form.appointmentDate, serviceDurationById]);

    const doctorBusyIntervals = useMemo(() => {
        return filterAppointmentsByStatus(doctorAppointmentsForDate, "SCHEDULED")
            .map((a) => {
                const start = toMinutes(formatTimeHHmm(a.appointmentTime, ""));
                const duration = serviceDurationById[a.serviceId] || 30;
                return {
                    start,
                    end: start + duration,
                    reason: "Doctor is not available",
                };
            });
    }, [doctorAppointmentsForDate, serviceDurationById]);

    const blockedSlots = useMemo(() => {
        const map = {};

        HALF_HOUR_SLOTS.forEach((slot) => {
            const reasons = [];
            const slotStart = toMinutes(slot);
            const slotEnd = slotStart + selectedServiceDuration;

            const hasPatientOverlap = patientBusyIntervals.some((interval) =>
                overlaps(slotStart, slotEnd, interval.start, interval.end)
            );
            const hasDoctorOverlap = form.doctorId
                ? doctorBusyIntervals.some((interval) =>
                    overlaps(slotStart, slotEnd, interval.start, interval.end)
                )
                : false;

            if (hasPatientOverlap) reasons.push("You already have an appointment");
            if (hasDoctorOverlap) reasons.push("Doctor is not available");

            map[slot] = reasons;
        });

        return map;
    }, [patientBusyIntervals, doctorBusyIntervals, form.doctorId, selectedServiceDuration]);

    const availableSlots = useMemo(() => {
        return HALF_HOUR_SLOTS.filter((slot) => blockedSlots[slot].length === 0);
    }, [blockedSlots]);

    useEffect(() => {
        if (form.appointmentTime && blockedSlots[form.appointmentTime]?.length > 0) {
            setForm((prev) => ({ ...prev, appointmentTime: "" }));
        }
    }, [blockedSlots, form.appointmentTime]);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const onBook = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.doctorId || !form.serviceId || !form.appointmentDate || !form.appointmentTime) {
            setError("Please complete doctor, service, date and time");
            return;
        }

        if (blockedSlots[form.appointmentTime]?.length > 0) {
            setError(blockedSlots[form.appointmentTime][0]);
            return;
        }

        setBookingLoading(true);

        try {
            await bookMyAppointment({
                doctorId: Number(form.doctorId),
                serviceId: Number(form.serviceId),
                appointmentDate: form.appointmentDate,
                appointmentTime: form.appointmentTime,
                notes: form.notes?.trim() || "",
            });

            setSuccess("Appointment booked successfully");
            setForm({
                ...getDefaultAppointmentBookingForm(),
				appointmentDate: getTomorrowDate(),
			});
            await loadPageData();
            await loadDoctorAvailability(form.doctorId, form.appointmentDate);
        } catch (err) {
            setError(extractApiErrorMessage(err));
        } finally {
            setBookingLoading(false);
        }
    };

    const formControlStyle = {
        width: "100%",
        padding: "8px",
        boxSizing: "border-box",
    };

    return (
        <div style={{ padding: "24px" }}>
            <h1>Patient Appointments</h1>

            <div style={{ marginBottom: "16px" }}>
                <button onClick={() => navigate("/patient")} style={{ marginRight: "8px" }}>
                    Back To Dashboard
                </button>
                <button onClick={handleLogout}>Logout</button>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && error && <p style={{ color: "red" }}>{error}</p>}
            {!loading && success && <p style={{ color: "green" }}>{success}</p>}

            {!loading && needsProfile && (
                <section>
                    <p>You need to create your patient profile first.</p>
                    <button onClick={() => navigate("/patient")}>Go To Dashboard</button>
                </section>
            )}

            {!loading && !needsProfile && (
                <>
                    <section style={{ maxWidth: "700px", marginBottom: "24px" }}>
                        <h2>Book Appointment</h2>
                        <form onSubmit={onBook}>
                            <div style={{ marginBottom: "10px" }}>
                                <label style={{ display: "block", marginBottom: "6px" }}>Doctor</label>
                                <select
                                    value={form.doctorId}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            doctorId: e.target.value,
                                            appointmentTime: "",
                                        }))
                                    }
                                    style={formControlStyle}
                                    required
                                >
                                    <option value="" disabled>
                                        Select doctor
                                    </option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.firstName} {d.lastName} ({d.specialty})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: "10px" }}>
                                <label style={{ display: "block", marginBottom: "6px" }}>Service</label>
                                <select
                                    value={form.serviceId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, serviceId: e.target.value }))}
                                    style={formControlStyle}
                                    required
                                >
                                    <option value="" disabled>
                                        Select service
                                    </option>
                                    {services.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} - {s.duration} min
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: "10px" }}>
                                <label style={{ display: "block", marginBottom: "6px" }}>Date</label>
                                <input
                                    type="date"
                                    value={form.appointmentDate}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            appointmentDate: e.target.value,
                                            appointmentTime: "",
                                        }))
                                    }
                                    style={formControlStyle}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "10px" }}>
                                <label style={{ display: "block", marginBottom: "6px" }}>
                                    Time (09:00 - 20:00 every 30 minutes)
                                </label>
                                <select
                                    value={form.appointmentTime}
                                    onChange={(e) => setForm((prev) => ({ ...prev, appointmentTime: e.target.value }))}
                                    style={formControlStyle}
                                    required
                                >
                                    <option value="" disabled>
                                        Select available time
                                    </option>
                                    {availableSlots.map((slot) => (
                                        <option key={slot} value={slot}>
                                            {slot}
                                        </option>
                                    ))}
                                </select>
                                {availabilityLoading && <p style={{ marginTop: "6px" }}>Loading doctor availability...</p>}
                            </div>

                            <div style={{ marginBottom: "10px" }}>
                                <label style={{ display: "block", marginBottom: "6px" }}>Notes</label>
                                <input
                                    value={form.notes}
                                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    style={formControlStyle}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={bookingLoading || doctors.length === 0}
                                style={{ ...formControlStyle, maxWidth: "100%" }}
                            >
                                {bookingLoading ? "Booking..." : "Book Appointment"}
                            </button>
                        </form>
                        {doctors.length === 0 && (
                            <p style={{ marginTop: "10px" }}>
                                No available doctors for your account yet.
                            </p>
                        )}
                    </section>

					<section style={{ marginBottom: "20px", maxWidth: "320px" }}>
						<h2>Check Date</h2>
						<input
							type="date"
							value={viewDate}
							onChange={(e) => setViewDate(e.target.value)}
							style={{ width: "100%", padding: "8px" }}
						/>
					</section>

                    <section style={{ marginBottom: "24px" }}>
                        <h2>Unavailable Times For {viewDate}</h2>
                        {HALF_HOUR_SLOTS.every((slot) => viewBlockedSlots[slot].length === 0) ? (
                            <p>All slots are available.</p>
                        ) : (
                            <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", maxWidth: "900px" }}>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {HALF_HOUR_SLOTS.filter((slot) => viewBlockedSlots[slot].length > 0).map((slot) => (
                                        <tr key={slot}>
                                            <td>{slot}</td>
                                            <td>{viewBlockedSlots[slot].join(", ")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    <section>
                        <h2>My Appointments On {viewDate}</h2>
                        {selectedDateAppointments.length === 0 ? (
                            <p>No appointments for this date.</p>
                        ) : (
                            <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Doctor</th>
                                        <th>Service</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedDateAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td>{a.id}</td>
                                            <td>{formatTimeHHmm(a.appointmentTime, "")}</td>
                                            <td>{a.status}</td>
                                            <td>{a.doctorName || a.doctorId}</td>
                                            <td>{a.serviceName || a.serviceId}</td>
                                            <td>{a.patientNotes || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default PatientAppointmentsPage;
