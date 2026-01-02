document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str.replace(/[&<>"']/g, (s) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activity = name;

        const spotsLeft = details.max_participants - details.participants.length;

        const safeName = escapeHtml(name);
        const safeDesc = escapeHtml(details.description || "");
        const safeSchedule = escapeHtml(details.schedule || "");

        // Participants HTML
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const participantsHtml =
          participants.length > 0
            ? `<details class="participants-section"><summary>Participants (${participants.length})</summary><ul class="participants-list">${participants
                .map(
                  (p) => `<li data-email="${encodeURIComponent(p)}"><span class="participant-badge">${escapeHtml(p)}</span><button class="delete-btn" title="Unregister">✕</button></li>`
                )
                .join("")}</ul></details>`
            : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${safeName}</h4>
          <p>${safeDesc}</p>
          <p><strong>Schedule:</strong> ${safeSchedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister clicks using event delegation
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest && event.target.closest(".delete-btn");
    if (!btn) return;

    const li = btn.closest("li");
    if (!li) return;

    const encodedEmail = li.getAttribute("data-email");
    const email = encodedEmail ? decodeURIComponent(encodedEmail) : null;
    const activityCard = btn.closest(".activity-card");
    const activity = activityCard ? activityCard.dataset.activity : null;
    if (!email || !activity) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      const result = await resp.json();

      if (resp.ok) {
        // Remove the list item
        li.remove();

        // Update participant count or show empty text
        const details = activityCard.querySelector(".participants-section");
        const list = details ? details.querySelector(".participants-list") : null;
        if (list && list.children.length === 0) {
          const newP = document.createElement("p");
          newP.className = "no-participants";
          newP.textContent = "No participants yet";
          details.replaceWith(newP);
        } else if (details) {
          const summary = details.querySelector("summary");
          const count = list ? list.children.length : 0;
          if (summary) summary.textContent = `Participants (${count})`;
        }

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 3000);
      } else {
        messageDiv.textContent = result.detail || "Failed to unregister";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Error unregistering:", err);
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh the UI so the new participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
