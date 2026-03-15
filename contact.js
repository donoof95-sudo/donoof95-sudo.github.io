const CONTACT_EMAIL = "berliozesponsors@gmail.com";

const contactForm = document.getElementById("contact-form");

if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(contactForm);
        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "").trim();
        const subject = String(formData.get("subject") || "").trim();
        const message = String(formData.get("message") || "").trim();

        const fullSubject = subject || "Message depuis le site";
        const bodyLines = [
            `Nom : ${name}`,
            `Email : ${email}`,
            "",
            "Message :",
            message
        ];

        const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
        window.location.href = mailtoUrl;
    });
}
