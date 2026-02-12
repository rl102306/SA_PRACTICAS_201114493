import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../services/order.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-create-order',
  templateUrl: './create-order.component.html',
  styleUrls: ['./create-order.component.css']
})
export class CreateOrderComponent implements OnInit {
  orderForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  currentUser: any;

  // Productos disponibles (hardcodeados para la demo)
  availableProducts = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Pizza Margarita', price: 12.99, category: 'Pizzas' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Hamburguesa Clásica', price: 8.50, category: 'Hamburguesas' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Refresco', price: 2.00, category: 'Bebidas' },
    { id: '55555555-5555-5555-5555-555555555555', name: 'Pasta Carbonara', price: 11.50, category: 'Pastas' }
  ];

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {
    this.orderForm = this.fb.group({
      restaurantId: ['99999999-9999-9999-9999-999999999999', Validators.required],
      deliveryAddress: ['', Validators.required],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]]
    });

    this.items.push(itemGroup);
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  onProductChange(index: number): void {
    const item = this.items.at(index);
    const productId = item.get('productId')?.value;
    const product = this.availableProducts.find(p => p.id === productId);
    
    if (product) {
      item.patchValue({ price: product.price });
    }
  }

  getTotalAmount(): number {
    let total = 0;
    this.items.controls.forEach(item => {
      const quantity = item.get('quantity')?.value || 0;
      const price = item.get('price')?.value || 0;
      total += quantity * price;
    });
    return total;
  }

  onSubmit(): void {
    if (this.orderForm.invalid || this.items.length === 0) {
      this.errorMessage = 'Por favor completa todos los campos y agrega al menos un producto';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const orderData = {
      ...this.orderForm.value,
      userId: this.currentUser?.id
    };

    console.log('📦 Enviando orden:', orderData);

    this.orderService.createOrder(orderData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `✅ ¡Orden creada exitosamente! ID: ${response.order?.id}`;
          console.log('✅ Orden creada:', response.order);
          
          // Limpiar formulario
          this.orderForm.reset({
            restaurantId: '99999999-9999-9999-9999-999999999999'
          });
          this.items.clear();
          
          // Redirigir después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/client/orders']);
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Error al crear orden';
          console.error('❌ Error:', response.message);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error al crear orden:', error);
        this.errorMessage = error.error?.message || 'Error al crear orden';
        this.isLoading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
