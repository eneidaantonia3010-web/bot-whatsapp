import cron from 'node-cron';
import { prisma } from './prisma';
import { sendSalonUpcomingAlert, sendCustomerReminder } from './whatsapp';

export function initCronJobs() {
  console.log('⏰ Initializing cron jobs for appointment reminders...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      
      // Look 40 to 45 minutes into the future
      const targetStart = new Date(now.getTime() + 40 * 60000);
      const targetEnd = new Date(now.getTime() + 45 * 60000);

      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: {
            gt: targetStart,
            lte: targetEnd,
          },
        },
        include: {
          customer: true,
          service: true,
        },
      });

      for (const apt of upcomingAppointments) {
        const timeStr = apt.date.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }) + 'hs';

        // 1. Send alert to the salon
        await sendSalonUpcomingAlert({
          customerName: apt.customer.name,
          serviceName: apt.service.name,
          timeStr,
        });

        // 2. Send reminder to the customer (if they have a phone number)
        if (apt.customer.phone) {
          await sendCustomerReminder({
            customerPhone: apt.customer.phone,
            customerName: apt.customer.name,
            serviceName: apt.service.name,
            timeStr,
          });
        }
      }
    } catch (error) {
      console.error('❌ Error running appointment reminder cron job:', error);
    }
  });
}
