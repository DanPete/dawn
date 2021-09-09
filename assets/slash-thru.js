class Discounts {
  constructor() {
    console.log(window.slash);
    this.endpoint = '/apps/slash/api/discounts';
  }

  getCurrentDiscount() {
    const cookies = document.cookie.split('; ');
    const activeDiscount = cookies.find((cookie) =>
      cookie.startsWith('discount_code=')
    );
    if (!activeDiscount) return;

    const activeDiscountCode = activeDiscount.split('=')[1];
    return activeDiscountCode;
  }

  async getDiscounts() {
    this.discountCode = this.getCurrentDiscount();
    if (!this.discountCode) return;
    console.log(this.discountCode);
    try {
      const res = await fetch(`${this.endpoint}/${this.discountCode}`);
      this.discountData = await res.json();
      console.log(this.discountData);
    } catch (error) {
      console.log(error);
    }
  }
}

const discounts = new Discounts();
await discounts.getDiscounts();
