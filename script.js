/**
 * EduPulse - Student Portal Interactive Functionality
 * Pure Vanilla JavaScript (No external frameworks or libraries)
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Tracking
    let pendingAssignmentsCount = 3;
    let announcementsVisible = true;

    // DOM Elements
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const btnWelcomeGreeting = document.getElementById('btn-welcome-greeting');
    const greetingDisplay = document.getElementById('greeting-display');
    const greetingText = document.getElementById('greeting-text');
    const welcomePendingHighlight = document.getElementById('welcome-pending-highlight');
    
    // Summary Metrics & Assignment Elements
    const statPendingNumber = document.getElementById('stat-assignments-pending');
    const statPendingStatus = document.getElementById('stat-assignments-status');
    const statPendingCaption = document.getElementById('stat-assignments-caption');
    const assignmentsBadge = document.getElementById('assignments-badge');
    const markCompletedButtons = document.querySelectorAll('.btn-mark-completed');

    // Announcement Toggle Elements
    const btnToggleAnnouncements = document.getElementById('btn-toggle-announcements');
    const announcementsContainer = document.getElementById('announcements-container');
    const announcementToggleText = document.getElementById('announcement-toggle-text');
    const announcementToggleIcon = document.getElementById('announcement-toggle-icon');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    /* ==========================================================================
       1. Mobile Navigation Menu Toggle
       ========================================================================== */
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('is-open');
            mobileMenuToggle.classList.toggle('is-active', isOpen);
            mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close mobile menu when a nav link is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                if (navMenu.classList.contains('is-open')) {
                    navMenu.classList.remove('is-open');
                    mobileMenuToggle.classList.remove('is-active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!mobileMenuToggle.contains(event.target) && !navMenu.contains(event.target)) {
                if (navMenu.classList.contains('is-open')) {
                    navMenu.classList.remove('is-open');
                    mobileMenuToggle.classList.remove('is-active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }

    /* ==========================================================================
       2. Welcome & Motivation Greeting
       ========================================================================== */
    const motivationalMessages = [
        "Believe in yourself! Every line of code and every study session brings you closer to your engineering goals.",
        "Consistency is key! Great engineers are built one concept at a time.",
        "Your hard work in Semester 5 is paving the way for incredible future opportunities.",
        "Stay curious, keep problem-solving, and take pride in how far you've come!",
        "Learning never exhausts the mind. Have a productive and rewarding study day!"
    ];

    if (btnWelcomeGreeting && greetingDisplay && greetingText) {
        btnWelcomeGreeting.addEventListener('click', () => {
            // Determine time of day greeting
            const currentHour = new Date().getHours();
            let timeGreeting = "Good day";
            if (currentHour < 12) {
                timeGreeting = "Good morning";
            } else if (currentHour < 18) {
                timeGreeting = "Good afternoon";
            } else {
                timeGreeting = "Good evening";
            }

            // Pick a random motivation message
            const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
            const quote = motivationalMessages[randomIndex];

            // Display in banner
            greetingText.innerHTML = `<strong>${timeGreeting}, Alex Morgan!</strong> ${quote}`;
            greetingDisplay.style.display = 'flex';

            // Show toast message
            showToast(`👋 ${timeGreeting}, Alex! Welcome back to EduPulse.`, 'info');
        });
    }

    /* ==========================================================================
       3. Mark Assignment as Completed Interaction
       ========================================================================== */
    markCompletedButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const assignmentCard = button.closest('.assignment-item');
            if (!assignmentCard || assignmentCard.classList.contains('is-completed')) {
                return;
            }

            const assignmentTitle = assignmentCard.querySelector('.assignment-title')?.textContent.trim() || 'Assignment';

            // Update assignment card visual state
            assignmentCard.classList.add('is-completed');

            // Update status tag
            const statusTag = assignmentCard.querySelector('.status-tag');
            if (statusTag) {
                statusTag.textContent = 'Completed';
                statusTag.classList.remove('status-pending');
                statusTag.classList.add('status-completed');
            }

            // Update button text and state
            button.disabled = true;
            button.classList.add('btn-completed-state');
            button.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Done</span>
            `;

            // Decrement pending counter
            if (pendingAssignmentsCount > 0) {
                pendingAssignmentsCount--;
            }

            // Update UI Counters dynamically
            updateAssignmentCounters(assignmentTitle);
        });
    });

    /**
     * Updates all pending assignment indicators across the dashboard
     */
    function updateAssignmentCounters(completedTitle) {
        // Update summary metric card number
        if (statPendingNumber) {
            statPendingNumber.textContent = pendingAssignmentsCount;
        }

        // Update badge in the assignments section header
        if (assignmentsBadge) {
            assignmentsBadge.textContent = `${pendingAssignmentsCount} Pending`;
            if (pendingAssignmentsCount === 0) {
                assignmentsBadge.classList.remove('counter-badge');
                assignmentsBadge.classList.add('badge', 'badge-primary');
            }
        }

        // Update welcome banner text
        if (welcomePendingHighlight) {
            if (pendingAssignmentsCount === 0) {
                welcomePendingHighlight.textContent = 'all assignments completed!';
            } else {
                welcomePendingHighlight.textContent = `${pendingAssignmentsCount} pending assignment${pendingAssignmentsCount === 1 ? '' : 's'}`;
            }
        }

        // Update summary card badge & caption if all are complete
        if (statPendingStatus && statPendingCaption) {
            if (pendingAssignmentsCount === 0) {
                statPendingStatus.textContent = 'All Completed';
                statPendingStatus.className = 'metric-pill pill-success';
                statPendingCaption.textContent = 'Great work! No assignments due';
            } else {
                statPendingCaption.textContent = `${pendingAssignmentsCount} due before next Monday`;
            }
        }

        // Notify user via toast
        showToast(`✓ Marked "${completedTitle}" as completed! (${pendingAssignmentsCount} remaining)`, 'success');
    }

    /* ==========================================================================
       4. Show / Hide Announcements Section
       ========================================================================== */
    if (btnToggleAnnouncements && announcementsContainer) {
        btnToggleAnnouncements.addEventListener('click', () => {
            announcementsVisible = !announcementsVisible;

            if (announcementsVisible) {
                announcementsContainer.classList.remove('is-hidden');
                announcementToggleText.textContent = 'Hide';
                announcementToggleIcon.innerHTML = '<polyline points="18 15 12 9 6 15"/>';
                btnToggleAnnouncements.setAttribute('aria-expanded', 'true');
                showToast('Announcements panel expanded', 'info');
            } else {
                announcementsContainer.classList.add('is-hidden');
                announcementToggleText.textContent = 'Show';
                announcementToggleIcon.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
                btnToggleAnnouncements.setAttribute('aria-expanded', 'false');
                showToast('Announcements panel collapsed', 'info');
            }
        });
    }

    /* ==========================================================================
       5. Toast Notification System
       ========================================================================== */
    function showToast(message, type = 'info') {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-info'}`;
        toast.innerHTML = `
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Auto remove toast after 3.2 seconds
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3200);
    }
});
