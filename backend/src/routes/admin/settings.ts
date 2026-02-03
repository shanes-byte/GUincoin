import express from 'express';
import prisma from '../../config/database';
import nodemailer from 'nodemailer';

const router = express.Router();

// Get SMTP settings (password masked)
router.get('/smtp', async (req, res) => {
  try {
    let settings = await prisma.smtpSettings.findUnique({
      where: { id: 'smtp' },
    });

    if (!settings) {
      // Return defaults if not configured
      settings = {
        id: 'smtp',
        host: null,
        port: 587,
        secure: false,
        user: null,
        pass: null,
        fromName: 'Guincoin Rewards',
        fromEmail: null,
        isEnabled: false,
        lastTestedAt: null,
        lastTestResult: null,
        updatedAt: new Date(),
      };
    }

    // Mask the password
    res.json({
      ...settings,
      pass: settings.pass ? '••••••••' : null,
      hasPassword: !!settings.pass,
    });
  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    res.status(500).json({ error: 'Failed to fetch SMTP settings' });
  }
});

// Update SMTP settings
router.put('/smtp', async (req, res) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail, isEnabled } = req.body;

    // Build update data - only include pass if it's not the masked placeholder
    const updateData: any = {
      host: host || null,
      port: port || 587,
      secure: secure ?? false,
      user: user || null,
      fromName: fromName || 'Guincoin Rewards',
      fromEmail: fromEmail || null,
      isEnabled: isEnabled ?? false,
    };

    // Only update password if a new one was provided (not masked)
    if (pass && pass !== '••••••••') {
      updateData.pass = pass;
    }

    const settings = await prisma.smtpSettings.upsert({
      where: { id: 'smtp' },
      create: {
        id: 'smtp',
        ...updateData,
        pass: pass && pass !== '••••••••' ? pass : null,
      },
      update: updateData,
    });

    res.json({
      ...settings,
      pass: settings.pass ? '••••••••' : null,
      hasPassword: !!settings.pass,
    });
  } catch (error) {
    console.error('Error updating SMTP settings:', error);
    res.status(500).json({ error: 'Failed to update SMTP settings' });
  }
});

// Test SMTP connection
router.post('/smtp/test', async (req, res) => {
  try {
    const { testEmail } = req.body;

    // Get current settings
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: 'smtp' },
    });

    if (!settings || !settings.host || !settings.user || !settings.pass) {
      return res.status(400).json({
        success: false,
        error: 'SMTP settings are incomplete. Please configure host, user, and password.',
      });
    }

    // Create transporter with current settings
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
    });

    // Verify connection
    await transporter.verify();

    // Send test email if address provided
    if (testEmail) {
      await transporter.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail || settings.user}>`,
        to: testEmail,
        subject: 'Guincoin SMTP Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">SMTP Configuration Test</h2>
            <p>This is a test email from Guincoin Rewards.</p>
            <p>If you're receiving this, your SMTP settings are configured correctly!</p>
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Sent at: ${new Date().toISOString()}
            </p>
          </div>
        `,
      });
    }

    // Update last test result
    await prisma.smtpSettings.update({
      where: { id: 'smtp' },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: 'success',
      },
    });

    res.json({
      success: true,
      message: testEmail
        ? `Connection verified and test email sent to ${testEmail}`
        : 'SMTP connection verified successfully',
    });
  } catch (error: any) {
    // Update last test result with failure
    await prisma.smtpSettings.update({
      where: { id: 'smtp' },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: `failed: ${error.message}`,
      },
    }).catch(() => {}); // Ignore if settings don't exist yet

    console.error('SMTP test failed:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'SMTP connection test failed',
    });
  }
});

export default router;
